import os
import urllib.request
import urllib.parse
import json as _json

from django.contrib.auth import authenticate, get_user_model, login, logout
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import PasswordResetToken
from .email_utils import send_password_reset_email

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

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
    )

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
    identifier_raw = request.data.get('email', '').strip()
    identifier = identifier_raw.lower()
    password = request.data.get('password', '')

    if not identifier_raw or not password:
        return Response(
            {"error": "Email y contraseña son obligatorios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Compatibilidad: permitir login por username o por email.
    # Esto evita problemas con usuarios creados manualmente (p.ej. superuser "admin").
    candidate_usernames = []

    direct_username = User.objects.filter(username__iexact=identifier_raw).values_list('username', flat=True).first()
    if direct_username:
        candidate_usernames.append(direct_username)

    email_username = User.objects.filter(email__iexact=identifier).values_list('username', flat=True).first()
    if email_username and email_username not in candidate_usernames:
        candidate_usernames.append(email_username)

    if identifier not in candidate_usernames:
        candidate_usernames.append(identifier)

    user = None
    for candidate in candidate_usernames:
        user = authenticate(request, username=candidate, password=password)
        if user is not None:
            break

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Devuelve los datos del usuario autenticado por cookie de sesión."""
    return Response(_user_payload(request.user))


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
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "phone": user.phone,
        "company": user.company,
    }
