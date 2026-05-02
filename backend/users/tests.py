from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from users.subscription import add_one_month

User = get_user_model()


class SubscriptionChangeTests(APITestCase):
    def setUp(self):
        self.now = timezone.now()

    def test_downgrade_blocked_during_active_cycle(self):
        user = User.objects.create_user(
            username="pro@test.com",
            email="pro@test.com",
            password="12345678",
            role="enterprise",
            subscription_cycle_start=self.now - timedelta(days=2),
            subscription_cycle_end=self.now + timedelta(days=10),
        )
        self.client.force_authenticate(user=user)
        response = self.client.patch("/api/me/", {"role": "premium"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertIn("No puedes bajar de plan", str(response.data))

    def test_upgrade_keeps_cycle_end_and_returns_proration(self):
        user = User.objects.create_user(
            username="prem@test.com",
            email="prem@test.com",
            password="12345678",
            role="premium",
            subscription_cycle_start=self.now - timedelta(days=3),
            subscription_cycle_end=self.now + timedelta(days=7),
        )
        original_cycle_end = user.subscription_cycle_end
        self.client.force_authenticate(user=user)
        response = self.client.patch("/api/me/", {"role": "enterprise"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("effective_role"), "enterprise")
        self.assertEqual(response.data.get("role_change_type"), "upgrade")
        self.assertTrue(float(response.data.get("proration_estimate", 0)) > 0)
        self.assertEqual(response.data.get("cycle_end"), original_cycle_end.isoformat())

    def test_downgrade_allowed_outside_cycle(self):
        cycle_start = self.now - timedelta(days=40)
        user = User.objects.create_user(
            username="prem2@test.com",
            email="prem2@test.com",
            password="12345678",
            role="premium",
            subscription_cycle_start=cycle_start,
            subscription_cycle_end=add_one_month(cycle_start),
        )
        self.client.force_authenticate(user=user)
        response = self.client.patch("/api/me/", {"role": "standard"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("role"), "standard")
        self.assertIsNone(response.data.get("subscription_cycle_start"))
        self.assertIsNone(response.data.get("subscription_cycle_end"))
