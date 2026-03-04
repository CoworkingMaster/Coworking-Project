from django.contrib.auth.models import AbstractUser
from django.db import models


class Rol(models.Model):
    nombre = models.CharField(max_length=45)

    def __str__(self):
        return self.nombre


class Suscripcion(models.Model):
    nombre = models.CharField(max_length=45)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    permite_sala = models.BooleanField(default=False)
    limite_horas_mensuales = models.IntegerField()

    def __str__(self):
        return self.nombre


class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    vigente_hasta = models.DateTimeField(null=True, blank=True)

    rol = models.ForeignKey(
        Rol,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    suscripcion = models.ForeignKey(
        Suscripcion,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    def __str__(self):
        return self.username