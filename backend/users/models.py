from django.contrib.auth.models import AbstractUser
from django.db import models


ROLE_CHOICES = [
    ('standard', 'Standard'),
    ('premium', 'Premium'),
    ('enterprise', 'Enterprise'),
]


class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    vigente_hasta = models.DateTimeField(null=True, blank=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='standard'
    )

    def __str__(self):
        return self.username