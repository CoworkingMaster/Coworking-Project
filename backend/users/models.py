import secrets
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


ROLE_CHOICES = [
    ('standard', 'Standard'),
    ('premium', 'Premium'),
    ('enterprise', 'Enterprise'),
]

BILLING_CYCLE_CHOICES = [
    ('monthly', 'Mensual'),
    ('annual', 'Anual'),
]

SUBSCRIPTION_STATUS_CHOICES = [
    ('active', 'Activa'),
    ('cancelled', 'Cancelada'),
]


class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=100, blank=True)
    job_title = models.CharField('cargo', max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    vigente_hasta = models.DateTimeField(null=True, blank=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='standard',
        help_text='Plan de suscripción (standard / premium / enterprise). En la app, enterprise se muestra como SuperPro. No hay otro modelo de suscripción.',
    )

    def __str__(self):
        return self.username


class PasswordResetToken(models.Model):
    """Token de un solo uso para restablecer contraseña (válido 1 hora)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        if self.used:
            return False
        delta = timezone.now() - self.created_at
        return delta.total_seconds() < 3600  # 1 hora

    def __str__(self):
        return f"Reset token for {self.user.email}"


class Subscription(models.Model):
    """Estado de suscripción de un usuario (billing cycle, fechas de período, estado)."""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='subscription'
    )
    billing_cycle = models.CharField(
        max_length=10, choices=BILLING_CYCLE_CHOICES, default='monthly'
    )
    status = models.CharField(
        max_length=20, choices=SUBSCRIPTION_STATUS_CHOICES, default='active'
    )
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Suscripción'
        verbose_name_plural = 'Suscripciones'

    def __str__(self):
        return f"{self.user.email} — {self.user.role} ({self.billing_cycle})"


class SubscriptionHistory(models.Model):
    """Registro inmutable de cada cambio en la suscripción."""
    ACTION_CHOICES = [
        ('created', 'Creada'),
        ('upgraded', 'Mejorada'),
        ('downgraded', 'Reducida'),
        ('cancelled', 'Cancelada'),
        ('reactivated', 'Reactivada'),
        ('cycle_changed', 'Ciclo cambiado'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='subscription_history'
    )
    plan = models.CharField(max_length=20, choices=ROLE_CHOICES)
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CYCLE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Historial de suscripción'
        verbose_name_plural = 'Historial de suscripciones'

    def __str__(self):
        return f"{self.user.email} — {self.action} → {self.plan}"