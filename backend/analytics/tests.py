from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from reservations.models import Reserva
from spaces.models import Espacio

User = get_user_model()


class AdminAnalyticsOverviewTests(APITestCase):
    endpoint = "/api/analytics/admin/overview/"

    def setUp(self):
        now = timezone.now()
        today = timezone.localdate(now)
        today_start = timezone.make_aware(datetime.combine(today, time.min))
        week_start = today_start - timedelta(days=today.weekday())
        last_week_start = week_start - timedelta(days=7)

        self.admin_user = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="strong-pass-123",
            role="enterprise",
            is_staff=True,
        )
        self.standard_user = User.objects.create_user(
            username="standard@example.com",
            email="standard@example.com",
            password="strong-pass-123",
            role="standard",
        )
        self.premium_user = User.objects.create_user(
            username="premium@example.com",
            email="premium@example.com",
            password="strong-pass-123",
            role="premium",
        )
        self.enterprise_user = User.objects.create_user(
            username="enterprise@example.com",
            email="enterprise@example.com",
            password="strong-pass-123",
            role="enterprise",
        )

        User.objects.filter(pk=self.admin_user.pk).update(created_at=today_start + timedelta(hours=1))
        User.objects.filter(pk=self.standard_user.pk).update(created_at=today_start + timedelta(hours=2))
        User.objects.filter(pk=self.premium_user.pk).update(created_at=today_start - timedelta(days=1, hours=2))
        User.objects.filter(pk=self.enterprise_user.pk).update(created_at=last_week_start + timedelta(days=1, hours=2))

        self.room = Espacio.objects.create(nombre="Sala North", capacidad=8, tipo="sala")
        self.desk = Espacio.objects.create(nombre="Desk 01", capacidad=1, tipo="puesto")

        Reserva.objects.create(
            usuario=self.standard_user,
            espacio=self.room,
            fecha_inicio=week_start + timedelta(days=1, hours=9),
            fecha_fin=week_start + timedelta(days=1, hours=11),
            estado="activa",
        )
        Reserva.objects.create(
            usuario=self.premium_user,
            espacio=self.room,
            fecha_inicio=week_start + timedelta(days=2, hours=14),
            fecha_fin=week_start + timedelta(days=2, hours=16),
            estado="finalizada",
        )
        Reserva.objects.create(
            usuario=self.enterprise_user,
            espacio=self.desk,
            fecha_inicio=last_week_start + timedelta(days=2, hours=9),
            fecha_fin=last_week_start + timedelta(days=2, hours=10),
            estado="activa",
        )
        Reserva.objects.create(
            usuario=self.enterprise_user,
            espacio=self.desk,
            fecha_inicio=last_week_start + timedelta(days=3, hours=15),
            fecha_fin=last_week_start + timedelta(days=3, hours=16),
            estado="cancelada",
        )

    def test_requires_admin_permissions(self):
        self.client.force_authenticate(user=self.standard_user)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enterprise_role_not_admin(self):
        self.client.force_authenticate(user=self.enterprise_user)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_analytics_payload_for_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()

        self.assertIn("users", payload)
        self.assertIn("plans", payload)
        self.assertIn("reservations", payload)
        self.assertIn("rooms", payload)

        self.assertEqual(payload["users"]["total"], 4)
        self.assertEqual(payload["reservations"]["total"], 4)
        self.assertEqual(payload["reservations"]["cancelled"], 1)
        self.assertEqual(payload["reservations"]["active"], 2)
        self.assertEqual(payload["reservations"]["finalized"], 1)

        self.assertEqual(len(payload["users"]["daily_series_last_14_days"]), 14)
        self.assertEqual(len(payload["reservations"]["daily_series_last_14_days"]), 14)
        self.assertEqual(len(payload["reservations"]["weekly_series_last_12_weeks"]), 12)
        self.assertEqual(len(payload["reservations"]["peak_hours"]), 24)

        top_spaces = payload["reservations"]["top_spaces"]
        self.assertGreaterEqual(len(top_spaces), 1)
        self.assertEqual(top_spaces[0]["nombre"], "Sala North")

        rooms = payload["rooms"]
        self.assertGreaterEqual(rooms["total_rooms"], 1)
        self.assertGreaterEqual(rooms["total_requests"], 1)
        self.assertGreaterEqual(rooms["occupancy_rate_operational"], 0)
        self.assertIn("usage_heatmap", rooms)
        self.assertEqual(len(rooms["usage_heatmap"]), 7)
        self.assertIn("top_by_occupancy", rooms)
