import os
import urllib.request
import urllib.parse
import json as _json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import PasswordResetToken, ROLE_CHOICES
from .email_utils import send_password_reset_email
from .subscription import (
    PAID_ROLES,
    add_one_month,
    compute_proration_estimate,
    ensure_paid_cycle,
    is_cycle_active,
    role_change_type,
)

User = get_user_model()

GOOGLE_CLIENT_ID = os.getenv(
    'GOOGLE_CLIENT_ID',
    '539407893951-m1t5r2cdmcuoemgmo94mphefur9jr9i3.apps.googleusercontent.com'
)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# ──────────────────────────────────────────────────────────
# REGISTRO
# ──────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('firstName', '')
    last_name = request.data.get('lastName', '')
    role = request.data.get('role', 'standard')

    if not email or not password:
        return Response(
            {"error": "Email y contraseña son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 8:
        return Response(
            {"error": "La contraseña debe tener al menos 8 caracteres"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {"error": "El email ya está registrado"},
            status=status.HTTP_400_BAD_REQUEST
        )

    allowed_roles = {c[0] for c in ROLE_CHOICES}
    if role not in allowed_roles:
        return Response(
            {"error": "Plan no válido"},
            status=status.HTTP_400_BAD_REQUEST
        )

    create_kwargs = {
        "username": email,
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
    }

    if role in PAID_ROLES:
        now = timezone.now()
        create_kwargs["subscription_cycle_start"] = now
        create_kwargs["subscription_cycle_end"] = add_one_month(now)

    user = User.objects.create_user(**create_kwargs)

    # Iniciar sesión automáticamente tras el registro
    login(request, user)

    return Response(
        {
            "message": "Usuario creado correctamente",
            "user": _user_payload(user),
        },
        status=status.HTTP_201_CREATED
    )


# ──────────────────────────────────────────────────────────
# LOGIN / LOGOUT / ME
# ──────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    if not email or not password:
        return Response(
            {"error": "Email y contraseña son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Django autentica por username; nuestro username es el email
    user = authenticate(request, username=email, password=password)

    if user is None:
        return Response(
            {"error": "Credenciales incorrectas. Revisa tu email y contraseña."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_active:
        return Response(
            {"error": "Esta cuenta está desactivada. Contacta con soporte."},
            status=status.HTTP_403_FORBIDDEN
        )

    login(request, user)

    return Response({
        "message": "Sesión iniciada correctamente",
        "user": _user_payload(user),
    })


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({"message": "Sesión cerrada"})


@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
def me(request):
    """GET: perfil o null. PATCH: actualizar datos (requiere sesión)."""
    if not request.user.is_authenticated:
        if request.method == 'PATCH':
            return Response(
                {"error": "Debes iniciar sesión para actualizar el perfil"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(None, status=status.HTTP_200_OK)

    if request.method == 'GET':
        if request.user.role in PAID_ROLES:
            ensure_paid_cycle(request.user, now=timezone.now(), persist=True)
            request.user.refresh_from_db()
        return Response(_user_payload(request.user))

    user = request.user
    raw = request.data
    try:
        data = dict(raw) if raw is not None else {}
    except (TypeError, ValueError):
        data = {}

    update_fields = []
    role_change_payload = None

    if 'first_name' in data:
        user.first_name = str(data['first_name'] or '').strip()[:150]
        update_fields.append('first_name')
    if 'last_name' in data:
        user.last_name = str(data['last_name'] or '').strip()[:150]
        update_fields.append('last_name')
    if 'phone' in data:
        user.phone = str(data['phone'] or '').strip()[:20]
        update_fields.append('phone')
    if 'company' in data:
        user.company = str(data['company'] or '').strip()[:100]
        update_fields.append('company')
    if 'job_title' in data:
        user.job_title = str(data['job_title'] or '').strip()[:120]
        update_fields.append('job_title')

    allowed_roles = {c[0] for c in ROLE_CHOICES}
    if 'role' in data:
        new_role = str(data['role'] or '').strip()
        if new_role and new_role not in allowed_roles:
            return Response(
                {"error": "Plan no válido"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_role and new_role != user.role:
            now = timezone.now()
            change_type = role_change_type(user.role, new_role)

            if change_type == "downgrade" and is_cycle_active(user, now):
                return Response(
                    {
                        "error": "No puedes bajar de plan durante un ciclo activo. Espera al fin del ciclo o mantén tu plan actual.",
                        "effective_role": user.role,
                        "cycle_end": user.subscription_cycle_end.isoformat() if user.subscription_cycle_end else None,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            proration_estimate = 0.0
            if change_type == "upgrade":
                if is_cycle_active(user, now):
                    cycle_start = user.subscription_cycle_start
                    cycle_end = user.subscription_cycle_end
                    proration_estimate = compute_proration_estimate(
                        user.role,
                        new_role,
                        cycle_start=cycle_start,
                        cycle_end=cycle_end,
                        now=now,
                    )
                else:
                    proration_estimate = compute_proration_estimate(user.role, new_role, now=now)
                    user.subscription_cycle_start = now
                    user.subscription_cycle_end = add_one_month(now)
                    update_fields.extend(['subscription_cycle_start', 'subscription_cycle_end'])

            if change_type == "downgrade":
                if new_role in PAID_ROLES:
                    user.subscription_cycle_start = now
                    user.subscription_cycle_end = add_one_month(now)
                    update_fields.extend(['subscription_cycle_start', 'subscription_cycle_end'])
                else:
                    user.subscription_cycle_start = None
                    user.subscription_cycle_end = None
                    update_fields.extend(['subscription_cycle_start', 'subscription_cycle_end'])

            user.role = new_role
            update_fields.append('role')

            role_change_payload = {
                "role_change_type": change_type,
                "effective_role": new_role,
                "proration_estimate": proration_estimate,
                "cycle_start": user.subscription_cycle_start.isoformat() if user.subscription_cycle_start else None,
                "cycle_end": user.subscription_cycle_end.isoformat() if user.subscription_cycle_end else None,
            }

    if 'email' in data:
        email = str(data['email'] or '').strip().lower()
        if email:
            if User.objects.filter(email=email).exclude(pk=user.pk).exists():
                return Response(
                    {"error": "Ese email ya está registrado"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email = email
            user.username = email
            update_fields.extend(['email', 'username'])

    if update_fields:
        user.save(update_fields=sorted(set(update_fields)))
        user.refresh_from_db()

    payload = _user_payload(user)
    if role_change_payload:
        payload.update(role_change_payload)
    return Response(payload)


# ──────────────────────────────────────────────────────────
# RECUPERACIÓN DE CONTRASEÑA
# ──────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Genera un token y envía el email de recuperación."""
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response(
            {"error": "El email es obligatorio"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Por seguridad respondemos igual aunque el email no exista
        return Response({"message": "Si el email está registrado recibirás un correo en breve."})

    # Invalida tokens anteriores del usuario
    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

    token_obj = PasswordResetToken.objects.create(user=user)
    reset_url = f"{FRONTEND_URL}/reset-password?token={token_obj.token}"

    full_name = f"{user.first_name} {user.last_name}".strip() or user.email
    sent = send_password_reset_email(user.email, full_name, reset_url)

    if not sent:
        return Response(
            {"error": "No se pudo enviar el correo. Inténtalo de nuevo más tarde."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    return Response({"message": "Si el email está registrado recibirás un correo en breve."})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Valida el token y actualiza la contraseña."""
    token_str = request.data.get('token', '').strip()
    new_password = request.data.get('password', '')

    if not token_str or not new_password:
        return Response(
            {"error": "Token y contraseña son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 8:
        return Response(
            {"error": "La contraseña debe tener al menos 8 caracteres"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        token_obj = PasswordResetToken.objects.select_related('user').get(token=token_str)
    except PasswordResetToken.DoesNotExist:
        return Response(
            {"error": "Token inválido o caducado"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not token_obj.is_valid():
        return Response(
            {"error": "El enlace ha caducado. Solicita uno nuevo."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = token_obj.user
    user.set_password(new_password)  # bcrypt via Django hasher configurado
    user.save()

    token_obj.used = True
    token_obj.save()

    return Response({"message": "Contraseña actualizada correctamente."})


# ──────────────────────────────────────────────────────────
# GOOGLE OAUTH LOGIN
# ──────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Acepta el access_token de Google (implicit flow vía @react-oauth/google),
    consulta la Google UserInfo API para obtener el email y perfil, y
    crea o recupera el usuario. Levanta sesión cookie.
    """
    access_token = request.data.get('access_token', '')

    if not access_token:
        return Response(
            {"error": "Token de Google no proporcionado"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Consultar la Google UserInfo API para verificar el token y obtener datos
    try:
        req = urllib.request.Request(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            id_info = _json.loads(resp.read().decode())
    except Exception as exc:
        return Response(
            {"error": f"Token de Google inválido: {exc}"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    email = id_info.get('email', '').lower()
    first_name = id_info.get('given_name', '')
    last_name = id_info.get('family_name', '')
    email_verified = id_info.get('email_verified', False)

    if not email or not email_verified:
        return Response(
            {"error": "No se pudo verificar el email de Google"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Crear o recuperar el usuario
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email,
            'first_name': first_name,
            'last_name': last_name,
            'role': 'standard',
        }
    )

    if created:
        user.set_unusable_password()
        user.save()
    else:
        updated = False
        if not user.first_name and first_name:
            user.first_name = first_name
            updated = True
        if not user.last_name and last_name:
            user.last_name = last_name
            updated = True
        if updated:
            user.save()

    login(request, user)

    return Response({
        "message": "Sesión iniciada con Google",
        "user": _user_payload(user),
        "created": created,
    })


# ──────────────────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────────────────

def _user_payload(user):
    vigente = user.vigente_hasta
    cycle_start = user.subscription_cycle_start
    cycle_end = user.subscription_cycle_end
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "phone": user.phone,
        "company": user.company,
        "job_title": user.job_title,
        "is_active": user.is_active,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "vigente_hasta": vigente.isoformat() if vigente else None,
        "subscription_cycle_start": cycle_start.isoformat() if cycle_start else None,
        "subscription_cycle_end": cycle_end.isoformat() if cycle_end else None,
    }
