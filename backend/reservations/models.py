from django.db import models
from django.conf import settings
from spaces.models import Espacio
from django.core.exceptions import ValidationError


class Reserva(models.Model):

    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('finalizada', 'Finalizada'),
        ('cancelada', 'Cancelada'),
    ]

    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES)

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    espacio = models.ForeignKey(Espacio, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.usuario} - {self.espacio}"

    def clean(self):

        reservas = Reserva.objects.filter(
            espacio=self.espacio,
            fecha_inicio__lt=self.fecha_fin,
            fecha_fin__gt=self.fecha_inicio
        )

        if self.pk:
            reservas = reservas.exclude(pk=self.pk)

        if reservas.exists():
            raise ValidationError("Este espacio ya está reservado en ese horario")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)