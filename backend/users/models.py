import secrets
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


ROLE_CHOICES = [
    ('standard', 'Standard'),
    ('premium', 'Premium'),
    ('enterprise', 'Enterprise'),
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