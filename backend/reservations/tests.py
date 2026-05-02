from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from reservations.models import Reserva
from spaces.models import Espacio
from django.utils import timezone
from datetime import timedelta
from users.subscription import add_one_month

User = get_user_model()

class ReservationTests(APITestCase):

    def setUp(self):
        now = timezone.now()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="123456",
            role="premium",
            subscription_cycle_start=now,
            subscription_cycle_end=add_one_month(now),
        )

        self.client.force_authenticate(user=self.user)

        self.space = Espacio.objects.create(
            nombre="Sala Test",
            capacidad=4,
            tipo="sala"
        )

        self.now = now

    def test_create_reservation_success(self):
        data = {
            "espacio": self.space.id,
            "fecha_inicio": self.now.isoformat(),
            "fecha_fin": (self.now + timedelta(hours=2)).isoformat(),
            "estado": "activa"
        }

        response = self.client.post("/api/reservations/", data, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Reserva.objects.count(), 1)

    def test_cannot_overlap_reservations(self):
        Reserva.objects.create(
            usuario=self.user,
            espacio=self.space,
            fecha_inicio=self.now,
            fecha_fin=self.now + timedelta(hours=2),
            estado="activa"
        )

        data = {
            "espacio": self.space.id,
            "fecha_inicio": (self.now + timedelta(hours=1)).isoformat(),
            "fecha_fin": (self.now + timedelta(hours=3)).isoformat(),
            "estado": "activa"
        }

        response = self.client.post("/api/reservations/", data, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("ya está reservado", str(response.data))

    def test_allow_non_overlapping_reservations(self):
        Reserva.objects.create(
            usuario=self.user,
            espacio=self.space,
            fecha_inicio=self.now,
            fecha_fin=self.now + timedelta(hours=2),
            estado="activa"
        )

        data = {
            "espacio": self.space.id,
            "fecha_inicio": (self.now + timedelta(hours=3)).isoformat(),
            "fecha_fin": (self.now + timedelta(hours=5)).isoformat(),
            "estado": "activa"
        }

        response = self.client.post("/api/reservations/", data, format="json")

        self.assertEqual(response.status_code, 201)

    def test_cancel_reservation(self):
        reserva = Reserva.objects.create(
            usuario=self.user,
            espacio=self.space,
            fecha_inicio=self.now,
            fecha_fin=self.now + timedelta(hours=2),
            estado="activa"
        )

        response = self.client.patch(
            f"/api/reservations/{reserva.id}/",
            {"estado": "cancelada"},
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        reserva.refresh_from_db()
        self.assertEqual(reserva.estado, "cancelada")


class ReservationPlanRulesTests(APITestCase):
    def setUp(self):
        self.now = timezone.now().replace(minute=0, second=0, microsecond=0)
        self.sala = Espacio.objects.create(nombre="Sala Plan", capacidad=6, tipo="sala")
        self.puesto = Espacio.objects.create(nombre="Puesto Plan", capacidad=1, tipo="puesto")

    def _reservation_payload(self, space_id, start, end):
        return {
            "espacio": space_id,
            "fecha_inicio": start.isoformat(),
            "fecha_fin": end.isoformat(),
            "estado": "activa",
        }

    def test_standard_cannot_book_room(self):
        user = User.objects.create_user(
            username="std@test.com",
            email="std@test.com",
            password="12345678",
            role="standard",
        )
        self.client.force_authenticate(user=user)
        payload = self._reservation_payload(self.sala.id, self.now, self.now + timedelta(hours=2))
        response = self.client.post("/api/reservations/", payload, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertIn("Standard", str(response.data))

    def test_premium_allows_room_until_10h_and_blocks_excess(self):
        cycle_start = self.now - timedelta(days=1)
        cycle_end = add_one_month(cycle_start)
        user = User.objects.create_user(
            username="premium@test.com",
            email="premium@test.com",
            password="12345678",
            role="premium",
            subscription_cycle_start=cycle_start,
            subscription_cycle_end=cycle_end,
        )
        self.client.force_authenticate(user=user)

        Reserva.objects.create(
            usuario=user,
            espacio=self.sala,
            fecha_inicio=self.now,
            fecha_fin=self.now + timedelta(hours=8),
            estado="activa",
        )

        ok_payload = self._reservation_payload(
            self.sala.id,
            self.now + timedelta(hours=8),
            self.now + timedelta(hours=10),
        )
        ok_response = self.client.post("/api/reservations/", ok_payload, format="json")
        self.assertEqual(ok_response.status_code, 201)

        blocked_payload = self._reservation_payload(
            self.sala.id,
            self.now + timedelta(hours=10),
            self.now + timedelta(hours=11),
        )
        blocked_response = self.client.post("/api/reservations/", blocked_payload, format="json")
        self.assertEqual(blocked_response.status_code, 403)
        self.assertIn("10h", str(blocked_response.data))

    def test_enterprise_has_no_room_limit(self):
        cycle_start = self.now - timedelta(days=1)
        cycle_end = add_one_month(cycle_start)
        user = User.objects.create_user(
            username="ent@test.com",
            email="ent@test.com",
            password="12345678",
            role="enterprise",
            subscription_cycle_start=cycle_start,
            subscription_cycle_end=cycle_end,
        )
        self.client.force_authenticate(user=user)
        payload = self._reservation_payload(self.sala.id, self.now, self.now + timedelta(hours=12))
        response = self.client.post("/api/reservations/", payload, format="json")
        self.assertEqual(response.status_code, 201)
