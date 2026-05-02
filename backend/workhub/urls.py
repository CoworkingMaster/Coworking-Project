from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from users.views import (
    register,
    login_view,
    logout_view,
    me,
    password_reset_request,
    password_reset_confirm,
    google_login,
    AdminUserListView,
    AdminUserDetailView,
)
from users.subscription_views import subscription_detail, subscription_cancel
from reservations.views import AdminReservationListView, AdminReservationDetailView


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

    #Reserva
    path('api/reservations/', include('reservations.urls')),

    # Analiticas admin
    path('api/analytics/', include('analytics.urls')),

    # Google OAuth
    path('api/auth/google/', google_login, name='google-login'),

    # Suscripción
    path('api/subscription/', subscription_detail, name='subscription'),
    path('api/subscription/cancel/', subscription_cancel, name='subscription-cancel'),

    # Admin — gestión
    path('api/admin/reservations/', AdminReservationListView.as_view(), name='admin-reservations'),
    path('api/admin/reservations/<int:pk>/', AdminReservationDetailView.as_view(), name='admin-reservation-detail'),
    path('api/admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('api/admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
]
