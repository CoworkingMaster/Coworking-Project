from django.test import TestCase

from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from reservations.models import Reserva
from spaces.models import Espacio
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class ReservationTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="123456"
        )

        self.client.force_authenticate(user=self.user)

        self.space = Espacio.objects.create(
            nombre="Sala Test",
            capacidad=4,
            tipo="sala"
        )

        self.now = timezone.now()

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