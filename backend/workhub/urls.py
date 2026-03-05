from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from users.views import (
    register,
    login_view,
    logout_view,
    me,
    password_reset_request,
    password_reset_confirm,
    google_login,
)


def health_check(request):
    """Endpoint de salud para verificar que el backend está activo."""
    return JsonResponse({'status': 'ok', 'service': 'workhub-backend'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),

    # Auth
    path('api/register/', register, name='register'),
    path('api/login/', login_view, name='login'),
    path('api/logout/', logout_view, name='logout'),
    path('api/me/', me, name='me'),

    # Recuperación de contraseña
    path('api/password-reset/', password_reset_request, name='password-reset-request'),
    path('api/password-reset/confirm/', password_reset_confirm, name='password-reset-confirm'),

    # Google OAuth
    path('api/auth/google/', google_login, name='google-login'),
]
