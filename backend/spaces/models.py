from django.db import models


class Espacio(models.Model):
    TIPO_CHOICES = [
        ('puesto', 'Puesto'),
        ('sala', 'Sala'),
    ]

    nombre = models.CharField(max_length=45)
    capacidad = models.IntegerField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)

    def __str__(self):
        return self.nombre