"""
Crea usuarios y reservas de prueba para desarrollo.
Uso: python manage.py seed_demo
Uso (limpiar antes): python manage.py seed_demo --flush
"""
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from reservations.models import Reserva
from spaces.models import Espacio

User = get_user_model()

DEMO_USERS = [
    {
        "email": "ana.garcia@demo.com",
        "first_name": "Ana",
        "last_name": "Garcia",
        "password": "demo1234",
        "role": "standard",
        "company": "Freelance",
        "job_title": "Diseñadora UX",
        "phone": "+34 611 000 001",
    },
    {
        "email": "carlos.ruiz@demo.com",
        "first_name": "Carlos",
        "last_name": "Ruiz",
        "password": "demo1234",
        "role": "premium",
        "company": "TechStartup SL",
        "job_title": "CEO",
        "phone": "+34 611 000 002",
    },
    {
        "email": "sofia.martin@demo.com",
        "first_name": "Sofia",
        "last_name": "Martin",
        "password": "demo1234",
        "role": "premium",
        "company": "Agencia Digital",
        "job_title": "Marketing Manager",
        "phone": "+34 611 000 003",
    },
    {
        "email": "luis.torres@demo.com",
        "first_name": "Luis",
        "last_name": "Torres",
        "password": "demo1234",
        "role": "enterprise",
        "company": "Corporación Global SA",
        "job_title": "CTO",
        "phone": "+34 611 000 004",
    },
    {
        "email": "marta.lopez@demo.com",
        "first_name": "Marta",
        "last_name": "Lopez",
        "password": "demo1234",
        "role": "standard",
        "company": "",
        "job_title": "Consultora",
        "phone": "+34 611 000 005",
    },
    {
        "email": "pablo.sanchez@demo.com",
        "first_name": "Pablo",
        "last_name": "Sanchez",
        "password": "demo1234",
        "role": "enterprise",
        "company": "InnovaLab",
        "job_title": "Product Manager",
        "phone": "+34 611 000 006",
    },
]


class Command(BaseCommand):
    help = "Crear usuarios y reservas de prueba"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Elimina los usuarios y reservas demo antes de crearlos de nuevo",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            demo_emails = [u["email"] for u in DEMO_USERS]
            deleted, _ = User.objects.filter(email__in=demo_emails).delete()
            self.stdout.write(self.style.WARNING(f"Eliminados {deleted} objetos demo"))

        spaces = list(Espacio.objects.all())
        if not spaces:
            self.stdout.write(self.style.ERROR(
                "No hay espacios en la base de datos. Ejecuta primero: python manage.py seed_spaces"
            ))
            return

        puestos = [s for s in spaces if s.tipo == "puesto"]
        salas = [s for s in spaces if s.tipo == "sala"]

        now = timezone.now()
        created_users = []

        for data in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={
                    "username": data["email"],
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "role": data["role"],
                    "company": data["company"],
                    "job_title": data["job_title"],
                    "phone": data["phone"],
                },
            )
            if created:
                user.set_password(data["password"])
                if data["role"] in ("premium", "enterprise"):
                    user.subscription_cycle_start = now
                    from users.subscription import add_one_month
                    user.subscription_cycle_end = add_one_month(now)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"  Usuario creado: {user.email} ({user.role})"))
            else:
                self.stdout.write(self.style.WARNING(f"  Ya existe: {user.email}"))
            created_users.append(user)

        # Reservas pasadas (finalizadas)
        reservation_count = 0
        for i, user in enumerate(created_users):
            eligible_spaces = puestos[:]
            if user.role in ("premium", "enterprise"):
                eligible_spaces += salas

            for day_offset in range(1, 15):
                if random.random() < 0.45:
                    continue
                space = random.choice(eligible_spaces)
                start_hour = random.choice([8, 9, 10, 11, 14, 15, 16])
                duration = random.choice([1, 2, 3, 4])
                start = now - timedelta(days=day_offset) + timedelta(
                    hours=start_hour - now.hour,
                    minutes=-now.minute,
                    seconds=-now.second,
                    microseconds=-now.microsecond,
                )
                end = start + timedelta(hours=duration)

                conflicto = Reserva.objects.filter(
                    espacio=space,
                    estado="finalizada",
                    fecha_inicio__lt=end,
                    fecha_fin__gt=start,
                ).exists()
                if conflicto:
                    continue

                estado = "cancelada" if random.random() < 0.15 else "finalizada"
                Reserva.objects.create(
                    usuario=user,
                    espacio=space,
                    fecha_inicio=start,
                    fecha_fin=end,
                    estado=estado,
                )
                reservation_count += 1

        # Reservas futuras (activas)
        for user in created_users:
            eligible_spaces = puestos[:]
            if user.role in ("premium", "enterprise"):
                eligible_spaces += salas

            for day_offset in range(1, 8):
                if random.random() < 0.55:
                    continue
                space = random.choice(eligible_spaces)
                start_hour = random.choice([9, 10, 11, 14, 15, 16])
                duration = random.choice([1, 2, 3])
                start = now + timedelta(days=day_offset) + timedelta(
                    hours=start_hour - now.hour,
                    minutes=-now.minute,
                    seconds=-now.second,
                    microseconds=-now.microsecond,
                )
                end = start + timedelta(hours=duration)

                conflicto = Reserva.objects.filter(
                    espacio=space,
                    estado="activa",
                    fecha_inicio__lt=end,
                    fecha_fin__gt=start,
                ).exists()
                if conflicto:
                    continue

                Reserva.objects.create(
                    usuario=user,
                    espacio=space,
                    fecha_inicio=start,
                    fecha_fin=end,
                    estado="activa",
                )
                reservation_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDemo listo: {len(created_users)} usuarios, {reservation_count} reservas creadas."
        ))
        self.stdout.write("Contrasena de todos los usuarios demo: demo1234")
