from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    phone = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=100, blank=True)

    ROLE_CHOICES = [
        ("standard", "Standard"),
        ("premium", "Premium"),
        ("superpro", "SuperPro"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="standard"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username