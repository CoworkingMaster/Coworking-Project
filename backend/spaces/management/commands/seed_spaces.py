from django.core.management.base import BaseCommand
from spaces.models import Espacio


class Command(BaseCommand):
    help = "Crear espacios iniciales"


    def handle(self, *args, **kwargs):

        espacios = [

            #Salas
            {"nombre": "Sala Innovación", "capacidad": 4, "tipo": "sala"},
            {"nombre": "Sala Estrategia", "capacidad": 8, "tipo": "sala"},
            {"nombre": "Sala Creativa", "capacidad": 6, "tipo": "sala"},
            {"nombre": "Sala Ejecutiva", "capacidad": 12, "tipo": "sala"},
            {"nombre": "Phone Booth 1", "capacidad": 1, "tipo": "sala"},
            {"nombre": "Phone Booth 2", "capacidad": 1, "tipo": "sala"},

            #Puestos de trabajo individuales
            {"nombre": "Puesto 1", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 2", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 3", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 4", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 5", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 6", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 7", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 8", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 9", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 10", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 11", "capacidad": 1, "tipo": "puesto"},
            {"nombre": "Puesto 12", "capacidad": 1, "tipo": "puesto"},


        ]

        for espacio in espacios:

            obj, created = Espacio.objects.get_or_create(
                nombre=espacio["nombre"],
                defaults={
                    "capacidad": espacio["capacidad"],
                    "tipo": espacio["tipo"],
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Creado: {obj.nombre}"))
            else:
                self.stdout.write(self.style.WARNING(f"Ya existe: {obj.nombre}"))