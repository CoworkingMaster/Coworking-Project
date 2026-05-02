# WorkHub 3D — Documentación Técnica

> **Versión:** 2.0.0 · **Fecha:** mayo 2026  
> **Stack:** Django 4.2 · DRF · React 19 · Vite · React Router v6 · MySQL 8 · Docker

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Infraestructura Docker](#2-infraestructura-docker)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Backend — Capa de autenticación JWT](#4-backend--capa-de-autenticación-jwt)
   - 4.1 [CookieJWTAuthentication](#41-cookiejwtauthentication)
   - 4.2 [Configuración SIMPLE_JWT](#42-configuración-simple_jwt)
   - 4.3 [Helpers de cookies](#43-helpers-de-cookies)
   - 4.4 [Integración con Gmail API (OAuth2)](#44-integración-con-gmail-api-oauth2)
5. [Backend — Serializers](#5-backend--serializers)
6. [Backend — Vistas (APIView)](#6-backend--vistas-apiview)
   - 6.1 [RegisterView](#61-registerview)
   - 6.2 [LoginView](#62-loginview)
   - 6.3 [RefreshTokenView](#63-refreshtokenview)
   - 6.4 [LogoutView](#64-logoutview)
   - 6.5 [MeView y UpdateProfileView](#65-meview-y-updateprofileview)
   - 6.6 [ChangePasswordView](#66-changepasswordview)
   - 6.7 [PasswordResetRequestView y PasswordResetConfirmView](#67-passwordresetrequestview-y-passwordresetconfirmview)
7. [Backend — URL routing](#7-backend--url-routing)
8. [Frontend — Estado global de autenticación (AuthContext)](#8-frontend--estado-global-de-autenticación-authcontext)
9. [Frontend — Custom Hooks](#9-frontend--custom-hooks)
   - 9.1 [useAuth](#91-useauth)
   - 9.2 [useApi](#92-useapi)
10. [Frontend — Enrutamiento (React Router v7)](#10-frontend--enrutamiento-react-router-v7)
11. [Frontend — ProtectedRoute](#11-frontend--protectedroute)
12. [Frontend — Componentes de autenticación](#12-frontend--componentes-de-autenticación)
    - 12.1 [LoginModal](#121-loginmodal)
    - 12.2 [RegisterModal](#122-registermodal)
    - 12.3 [ForgotPasswordModal](#123-forgotpasswordmodal)
    - 12.4 [ResetPasswordPage](#124-resetpasswordpage)
13. [Frontend — Páginas privadas](#13-frontend--páginas-privadas)
    - 13.1 [AppLayout y AppNavbar](#131-applayout-y-appnavbar)
    - 13.2 [Dashboard](#132-dashboard)
    - 13.3 [Profile](#133-profile)
14. [Flujos completos end-to-end](#14-flujos-completos-end-to-end)
15. [Tabla de endpoints](#15-tabla-de-endpoints)
16. [Seguridad — Decisiones de diseño](#16-seguridad--decisiones-de-diseño)
17. [Panel de administración](#17-panel-de-administración)
    - 17.1 [Acceso y redirección](#171-acceso-y-redirección)
    - 17.2 [Protección de endpoints](#172-protección-de-endpoints-backend)
    - 17.3 [Panel de analíticas](#173-panel-de-analíticas----admin-analytics)
    - 17.4 [Gestión de reservas](#174-gestión-de-reservas----admin-reservations)
    - 17.5 [Gestión de usuarios](#175-gestión-de-usuarios----admin-users)
    - 17.6 [Componente de navegación admin](#176-componente-de-navegación-admin)
18. [Datos de prueba (seeds)](#18-datos-de-prueba-seeds)
    - 18.1 [Seed de espacios](#181-seed-de-espacios)
    - 18.2 [Seed de usuarios y reservas demo](#182-seed-de-usuarios-y-reservas-demo)

---

## 1. Arquitectura general

El proyecto sigue una arquitectura **cliente-servidor desacoplada** con tres capas:

```
┌──────────────────────────────────────────────────────┐
│  BROWSER                                             │
│  React SPA (Vite · React Router)                    │
│  puerto 5173                                         │
│         │ fetch /api/* (credentials: include)        │
│         │ cookies httpOnly (access_token, refresh_token)
└─────────┼────────────────────────────────────────────┘
          │ proxy Vite → Docker network workhub-net
┌─────────▼────────────────────────────────────────────┐
│  BACKEND                                             │
│  Django 4.2 + DRF + simplejwt                       │
│  puerto 8000                                         │
│         │ ORM                                        │
└─────────┼────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────┐
│  BASE DE DATOS                                       │
│  MySQL 8.0 — workhub_db                             │
│  puerto 3306                                         │
└──────────────────────────────────────────────────────┘
```

El frontend **nunca accede directamente** a la base de datos. Toda la lógica de negocio reside en el backend, que expone una API REST bajo el prefijo `/api/`. El frontend se comunica exclusivamente a través de esa API enviando cookies en cada request (`credentials: 'include'`).

---

## 2. Infraestructura Docker

El proyecto define tres servicios en `docker-compose.yml`:

| Servicio | Imagen | Puerto | Dependencias |
|---|---|---|---|
| `workhub-db` | mysql:8.0 | 3306 | — |
| `workhub-backend` | Dockerfile local | 8000 | db (healthy) |
| `workhub-frontend` | Dockerfile local | 5173 | backend |

Las variables sensibles (contraseñas, secret keys, credenciales OAuth) se gestionan mediante un fichero `.env` en la raíz del proyecto. Este fichero **no se versiona** (incluido en `.gitignore`) para evitar la exposición de secretos en el repositorio.

Las variables de entorno relevantes para el sistema de autenticación son:

```env
DJANGO_SECRET_KEY=<clave aleatoria de alta entropía>
GMAIL_CLIENT_ID=<oauth2 client id>
GMAIL_CLIENT_SECRET=<oauth2 client secret>
GMAIL_REFRESH_TOKEN=<refresh token de OAuth Playground>
GMAIL_SENDER_EMAIL=<email remitente>
FRONTEND_URL=http://localhost:5173
```

---

## 3. Modelo de datos

**Archivo:** `backend/users/models.py`

El modelo `User` extiende `AbstractUser` de Django, heredando todos los campos del sistema de autenticación nativo (password hash con PBKDF2, is_active, is_staff, etc.) y añadiendo tres campos de dominio:

```python
class User(AbstractUser):
    phone    = models.CharField(max_length=20, blank=True)
    company  = models.CharField(max_length=100, blank=True)
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default="standard")
    created_at = models.DateTimeField(auto_now_add=True)

    ROLE_CHOICES = [
        ("standard", "Standard"),
        ("premium",  "Premium"),
        ("superpro", "SuperPro"),
    ]
```

El campo `role` determina el plan de suscripción del usuario. Se usa `username = email` para unificar el campo de identificación, evitando que el usuario deba recordar un nombre de usuario separado de su correo electrónico.

La tabla resultante en MySQL es `users_user` con los campos estándar de Django más `phone`, `company`, `role` y `created_at`. Django registra este modelo personalizado mediante `AUTH_USER_MODEL = "users.User"` en `settings.py` (línea 192).

---

## 4. Backend — Capa de autenticación JWT

### 4.1 CookieJWTAuthentication

**Archivo:** `backend/users/authentication.py`

El mecanismo de autenticación estándar de `djangorestframework-simplejwt` lee el token del encabezado HTTP `Authorization: Bearer <token>`. Esta aproximación es vulnerable a ataques XSS porque el token reside en `localStorage` o en el estado de la aplicación JavaScript, desde donde código malicioso podría exfiltrarlo.

La solución implementada consiste en subclasificar `JWTAuthentication` y sobrescribir el método `authenticate()` para leer el token desde una **cookie HttpOnly** en lugar del encabezado:

```python
# backend/users/authentication.py  líneas 7-26

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None                        # no hay cookie → anónimo

        try:
            validated_token = AccessToken(raw_token)
        except (TokenError, InvalidToken):
            return None                        # token inválido → anónimo (no 401)

        return self.get_user(validated_token), validated_token
```

**Decisiones importantes:**

- El método devuelve `None` (no lanza excepción) cuando no existe la cookie o cuando el token es inválido. DRF interpreta `None` como "usuario anónimo" y aplicará las `permission_classes` de la vista para decidir si se permite o deniega el acceso. Esto permite que las vistas con `AllowAny` funcionen correctamente incluso sin token.
- El resto de la validación del payload (firma HMAC, expiración, user lookup) lo hereda de `JWTAuthentication.get_user()`.

Esta clase se registra como autenticador por defecto en `settings.py` (línea 154):

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'users.authentication.CookieJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### 4.2 Configuración SIMPLE_JWT

**Archivo:** `backend/workhub/settings.py`, líneas 163–177

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_COOKIE':          'access_token',
    'AUTH_COOKIE_REFRESH':  'refresh_token',
    'AUTH_COOKIE_SECURE':   os.getenv('DJANGO_DEBUG', 'True').lower() not in ('true', '1', 'yes'),
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE':  'Lax',
    'AUTH_COOKIE_PATH':      '/',
}
```

| Parámetro | Valor | Justificación |
|---|---|---|
| `ACCESS_TOKEN_LIFETIME` | 15 min | Ventana de ataque corta si el token es interceptado |
| `REFRESH_TOKEN_LIFETIME` | 7 días | Permite sesiones largas sin reautenticación manual |
| `ROTATE_REFRESH_TOKENS` | True | Cada refresh emite un nuevo refresh token, invalidando el anterior |
| `AUTH_COOKIE_HTTP_ONLY` | True | JavaScript no puede leer la cookie → mitiga XSS |
| `AUTH_COOKIE_SAMESITE` | Lax | Bloquea envío de cookies en requests cross-site → mitiga CSRF |
| `AUTH_COOKIE_SECURE` | False en dev / True en prod | HTTPS obligatorio en producción |

### 4.3 Helpers de cookies

**Archivo:** `backend/users/views.py`, líneas 38–68

Para cumplir el principio **DRY** (*Don't Repeat Yourself*), la lógica de escritura y borrado de cookies se encapsula en dos funciones privadas (prefijo `_` indica uso interno al módulo):

```python
def _set_auth_cookies(response: Response, refresh: RefreshToken) -> None:
    cfg = settings.SIMPLE_JWT
    kwargs = dict(
        path     = cfg.get('AUTH_COOKIE_PATH', '/'),
        secure   = cfg.get('AUTH_COOKIE_SECURE', False),
        httponly = cfg.get('AUTH_COOKIE_HTTP_ONLY', True),
        samesite = cfg.get('AUTH_COOKIE_SAMESITE', 'Lax'),
    )
    response.set_cookie(
        cfg.get('AUTH_COOKIE', 'access_token'),
        str(refresh.access_token),
        max_age=int(cfg['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        **kwargs,
    )
    response.set_cookie(
        cfg.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
        str(refresh),
        max_age=int(cfg['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        **kwargs,
    )
```

`_set_auth_cookies` recibe un objeto `RefreshToken` y escribe **dos cookies** en la respuesta HTTP: el access token (vida de 15 min) y el refresh token (vida de 7 días). Ambas cookies se configuran con los atributos de seguridad del diccionario `SIMPLE_JWT`.

`_clear_auth_cookies` borra ambas cookies estableciendo una expiración pasada, que el navegador interpreta como instrucción de eliminación.

Estas funciones son invocadas por `RegisterView`, `LoginView`, `RefreshTokenView`, `LogoutView` y `ChangePasswordView`.

### 4.4 Integración con Gmail API (OAuth2)

**Archivo:** `backend/users/views.py`, líneas 70–84

El envío de correos transaccionales (reset de contraseña) utiliza la **Gmail API v1** con autenticación OAuth2 en lugar de SMTP con contraseña de aplicación. La diferencia principal es que OAuth2 permite revocar el acceso de forma granular desde Google Cloud Console sin comprometer la contraseña de la cuenta.

```python
def _send_gmail(to_email: str, subject: str, html_body: str) -> None:
    creds = Credentials(
        token=None,                                      # se obtiene dinámicamente
        refresh_token=settings.GMAIL_REFRESH_TOKEN,
        client_id=settings.GMAIL_CLIENT_ID,
        client_secret=settings.GMAIL_CLIENT_SECRET,
        token_uri='https://oauth2.googleapis.com/token',
    )
    service = build('gmail', 'v1', credentials=creds)
    msg = MIMEText(html_body, 'html')
    msg['to']      = to_email
    msg['from']    = settings.GMAIL_SENDER_EMAIL
    msg['subject'] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(userId='me', body={'raw': raw}).execute()
```

El flujo de autenticación OAuth2 es:
1. `google-auth` toma el `refresh_token` almacenado en `.env`
2. Solicita un `access_token` nuevo a `oauth2.googleapis.com/token` (lifetime: 1h)
3. Usa ese `access_token` para autenticar la llamada a `gmail.users().messages().send()`
4. El email se codifica en base64 URL-safe según el estándar RFC 2822 antes de enviarse

---

## 5. Backend — Serializers

**Archivo:** `backend/users/serializers.py`

Se han definido **7 serializers** con responsabilidades únicas, evitando la exposición accidental de campos sensibles entre casos de uso distintos:

### `RegisterSerializer` (líneas 6-31)

```python
class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name  = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model  = User
        fields = ['email', 'password', 'role', 'first_name', 'last_name']
```

- `write_only=True` en `password` garantiza que el hash nunca se devuelve en respuestas.
- `validate_email` comprueba unicidad antes de llegar al `create()`, devolviendo un error 400 descriptivo en lugar de un error 500 de integridad de base de datos.
- `create()` usa `create_user()` que llama a `set_password()` internamente, asegurando que la contraseña se almacena hasheada (PBKDF2-SHA256 por defecto en Django).

### `UserSerializer` (líneas 38-42)

Serializer de **sólo lectura** para devolver el perfil del usuario autenticado. Los campos `id`, `email`, `username` y `role` son `read_only_fields`, por lo que nunca se aceptan como entrada.

### `UpdateProfileSerializer` (líneas 44-47)

Expone únicamente `first_name`, `last_name`, `phone` y `company`. No incluye `email`, `role` ni `password`, evitando la escalada de privilegios o el cambio de email a través de este endpoint.

### `ChangePasswordSerializer` (líneas 49-57)

```python
def validate_old_password(self, value):
    user = self.context['request'].user    # acceso al request via contexto
    if not user.check_password(value):
        raise serializers.ValidationError('Contraseña actual incorrecta.')
    return value
```

Recibe el `request` a través del parámetro `context` del serializer. Valida que la contraseña actual sea correcta antes de permitir el cambio, previniendo cambios de contraseña no autorizados si alguien obtiene acceso a una sesión abierta.

### `PasswordResetRequestSerializer` y `PasswordResetConfirmSerializer`

Serializers simples para validar el formato de los datos de entrada de los endpoints de recuperación de contraseña. `PasswordResetConfirmSerializer` valida que `uid`, `token` y `new_password` estén presentes.

---

## 6. Backend — Vistas (APIView)

**Archivo:** `backend/users/views.py`

Todas las vistas heredan de `rest_framework.views.APIView`. Esta elección sobre `@api_view` proporciona: organización por método HTTP en métodos de instancia (`def post`, `def get`, `def patch`), capacidad de herencia para vistas futuras, y declaración explícita de `permission_classes` por clase.

### 6.1 RegisterView

**Líneas 88-102** · `POST /api/register/`

```python
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)   # 400 automático si falla
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response(
            {'message': 'Usuario creado correctamente', 'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, refresh)        # auto-login tras registro
        return response
```

Tras crear el usuario, se genera inmediatamente un `RefreshToken` y se establecen las cookies. Esto evita que el usuario tenga que hacer login manual tras el registro, mejorando la UX y coherente con el comportamiento de las aplicaciones modernas.

### 6.2 LoginView

**Líneas 105-124** · `POST /api/token/`

```python
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # ...validación de serializer...
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Credenciales incorrectas'}, status=401)

        if not user.check_password(password):
            return Response({'error': 'Credenciales incorrectas'}, status=401)
        if not user.is_active:
            return Response({'error': 'Cuenta desactivada'}, status=403)
```

Importante: cuando el email no existe o la contraseña es incorrecta, **ambos casos devuelven el mismo mensaje de error** ("Credenciales incorrectas"). Esto previene la enumeración de usuarios: un atacante no puede distinguir si el email existe en la base de datos.

### 6.3 RefreshTokenView

**Líneas 127-147** · `POST /api/token/refresh/`

```python
class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.COOKIES.get(
            settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token')
        )
        if not raw:
            return Response({'error': 'No hay refresh token'}, status=401)
        try:
            refresh = RefreshToken(raw)
            response = Response({'message': 'Token renovado'})
            _set_auth_cookies(response, refresh)
            return response
        except TokenError:
            resp = Response({'error': 'Refresh token inválido o expirado'}, status=401)
            _clear_auth_cookies(resp)
            return resp
```

Lee el refresh token **desde la cookie** (no del body ni del header). Gracias a `ROTATE_REFRESH_TOKENS = True`, cada llamada a este endpoint genera un nuevo refresh token, invalidando el anterior. Si el token es inválido o ha expirado, se borran ambas cookies (logout efectivo).

### 6.4 LogoutView

**Líneas 150-154** · `POST /api/logout/`

```python
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'message': 'Sesión cerrada'})
        _clear_auth_cookies(response)
        return response
```

`AllowAny` es necesario porque el logout debe funcionar incluso cuando el access token ha expirado. La sesión se destruye eliminando las cookies, independientemente del estado del token.

### 6.5 MeView y UpdateProfileView

**Líneas 162-177** · `GET /api/me/` · `PATCH /api/me/update/`

```python
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)   # devuelve perfil completo
```

`UpdateProfileView` usa `partial=True` para permitir la actualización de campos individuales (PATCH semántico). Devuelve el `UserSerializer` completo (no el `UpdateProfileSerializer`), garantizando que el frontend siempre recibe la misma estructura de datos del usuario independientemente del endpoint usado.

### 6.6 ChangePasswordView

**Líneas 180-193** · `POST /api/me/change-password/`

```python
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        refresh = RefreshToken.for_user(request.user)
        response = Response({'message': 'Contraseña actualizada correctamente'})
        _set_auth_cookies(response, refresh)    # renueva cookies con nuevo token
        return response
```

Tras cambiar la contraseña, se emiten nuevas cookies. Esto es importante porque la contraseña forma parte del hash almacenado que Django usa para validar tokens de reset. Sin renovar el token, el usuario quedaría deslogueado en el próximo silent refresh.

### 6.7 PasswordResetRequestView y PasswordResetConfirmView

**Líneas 201-278** · `POST /api/password-reset/` · `POST /api/password-reset/confirm/`

```python
# PasswordResetRequestView.post() — líneas 208-244
user = User.objects.get(email=email)
uid   = urlsafe_base64_encode(force_bytes(user.pk))
token = default_token_generator.make_token(user)
reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
# ...construcción del HTML del email...
_send_gmail(email, 'Recuperación de contraseña — WorkHub 3D', html_body)
```

Se usa `default_token_generator` de Django (basado en HMAC-SHA256 sobre `user.pk + password_hash + last_login + timestamp`). Este token **expira automáticamente en 24 horas** (configurable via `PASSWORD_RESET_TIMEOUT`) y se invalida también tras cualquier cambio de contraseña.

La vista siempre devuelve el mismo mensaje de éxito independientemente de si el email existe o no, previniendo la enumeración de usuarios:

```python
except User.DoesNotExist:
    pass   # no revelar que el email no existe
# ...
return Response({'message': 'Si el email existe, recibirás un enlace de recuperación.'})
```

---

## 7. Backend — URL routing

**Archivo:** `backend/workhub/urls.py`

```python
urlpatterns = [
    path('admin/',                        admin.site.urls),
    path('api/health/',                   health_check),
    path('api/register/',                 RegisterView.as_view()),
    path('api/token/',                    LoginView.as_view()),
    path('api/token/refresh/',            RefreshTokenView.as_view()),
    path('api/logout/',                   LogoutView.as_view()),
    path('api/me/',                       MeView.as_view()),
    path('api/me/update/',                UpdateProfileView.as_view()),
    path('api/me/change-password/',       ChangePasswordView.as_view()),
    path('api/password-reset/',           PasswordResetRequestView.as_view()),
    path('api/password-reset/confirm/',   PasswordResetConfirmView.as_view()),
]
```

Se usa `.as_view()` en lugar de registrar un `DefaultRouter`, ya que las rutas no siguen el patrón CRUD canónico de un ViewSet. El diseño de URLs sigue convenciones REST semánticas: los recursos de usuario están bajo `/api/me/`, la autenticación bajo `/api/token/` (compatible con la nomenclatura de simplejwt), y la recuperación de contraseña bajo `/api/password-reset/`.

---

## 8. Frontend — Estado global de autenticación (AuthContext)

**Archivo:** `frontend/src/contexts/AuthContext.jsx`

El estado de autenticación se gestiona mediante un **contexto de React** combinado con `useReducer`. Se elige `useReducer` sobre `useState` porque el estado de autenticación involucra transiciones entre múltiples estados discretos con lógica derivada, lo que se ajusta mejor al patrón reducer que a múltiples `useState` independientes.

### Estado y acciones

```javascript
// Líneas 4-6
const initialState = {
    user: null,
    status: 'idle',  // 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
}

// Líneas 10-15
export const AUTH_ACTIONS = {
    LOADING:      'LOADING',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT:       'LOGOUT',
    UPDATE_USER:  'UPDATE_USER',
}
```

La máquina de estados implícita es:

```
idle ──(mount)──→ loading ──(GET /api/me/ ok)──→ authenticated
                         └──(GET /api/me/ fail)─→ unauthenticated
authenticated ──(logout)──→ unauthenticated
authenticated ──(UPDATE_USER)──→ authenticated (user parcialmente actualizado)
```

### Restauración de sesión al montar

```javascript
// Líneas 61-77
useEffect(() => {
    dispatch({ type: AUTH_ACTIONS.LOADING })

    fetch('/api/me/', { credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error('No hay sesión')
            return res.json()
        })
        .then(user => {
            dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: user })
            scheduleRefresh()
        })
        .catch(() => {
            dispatch({ type: AUTH_ACTIONS.LOGOUT })
        })

    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
}, [scheduleRefresh])
```

Al montar el `AuthProvider`, se llama a `GET /api/me/` con la cookie existente. Si el access token almacenado en la cookie sigue siendo válido, el backend devuelve los datos del usuario y la sesión se restaura sin que el usuario tenga que hacer login de nuevo (incluso tras recargar la página).

### Silent refresh

```javascript
// Líneas 43-56
const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(async () => {
        try {
            const res = await fetch('/api/token/refresh/', {
                method: 'POST',
                credentials: 'include',
            })
            if (!res.ok) dispatch({ type: AUTH_ACTIONS.LOGOUT })
            else scheduleRefresh()    // se re-programa indefinidamente
        } catch {
            dispatch({ type: AUTH_ACTIONS.LOGOUT })
        }
    }, 13 * 60 * 1000)  // 13 minutos (el access token expira a los 15)
}, [])
```

El timer se lanza 2 minutos antes de que expire el access token. Si el refresh falla (refresh token expirado, servidor caído), el usuario pasa a estado `unauthenticated` y es redirigido al login. Se usa `useRef` para almacenar el `timeoutId` y poder cancelarlo en el cleanup del efecto o al hacer logout manualmente.

---

## 9. Frontend — Custom Hooks

### 9.1 useAuth

**Archivo:** `frontend/src/hooks/useAuth.js`

```javascript
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
    return ctx
}
```

Encapsula el acceso al contexto con validación. Si se usa fuera del `AuthProvider`, lanza un error descriptivo en lugar del error críptico "Cannot destructure property 'user' of undefined". Devuelve el objeto completo del contexto: `{ user, status, login, logout, updateUser }`.

### 9.2 useApi

**Archivo:** `frontend/src/hooks/useApi.js`

```javascript
export function useApi() {
    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)

    const execute = useCallback(async (url, options = {}) => {
        setLoading(true)
        setError(null)

        try {
            const res = await fetch(url, {
                credentials: 'include',           // siempre envía cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            })

            const json = await res.json()

            if (!res.ok) {
                const message = json?.error || json?.detail || 'Error desconocido'
                setError(message)
                return { ok: false, data: json }
            }

            setData(json)
            return { ok: true, data: json }      // contrato uniforme de retorno
        } catch {
            setError('No se pudo conectar con el servidor')
            return { ok: false, data: null }
        } finally {
            setLoading(false)
        }
    }, [])

    const reset = useCallback(() => { setData(null); setError(null) }, [])

    return { data, loading, error, execute, reset }
}
```

El hook presenta un **contrato de retorno uniforme**: siempre devuelve `{ ok: boolean, data: object|null }`. Esto permite a los componentes consumidores usar desestructuración directa:

```javascript
const { ok, data } = await execute('/api/token/', { method: 'POST', body: ... })
if (ok) { login(data.user); navigate('/app/dashboard') }
```

`credentials: 'include'` es obligatorio para que el navegador adjunte las cookies httpOnly en cada petición a la API, ya que sin él las cookies no son enviadas en requests `fetch`.

---

## 10. Frontend — Enrutamiento (React Router v7)

**Archivo:** `frontend/src/App.jsx`

La aplicación define dos dominios de rutas — públicas y privadas — con layouts distintos:

```jsx
<AuthProvider>
    <Routes>
        {/* Rutas públicas — Layout: Navbar + sections + Footer */}
        <Route path="/"               element={<LandingPage openLogin={openLogin} />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Rutas privadas — Layout: AppNavbar + contenido de página */}
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index          element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile"   element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<LandingPage />} />
    </Routes>
</AuthProvider>
```

El uso de **rutas anidadas** bajo `/app` con `AppLayout` como elemento padre permite que `AppNavbar` se renderice una sola vez para todas las páginas privadas. Las páginas se inyectan mediante `<Outlet />` en `AppLayout`, sin necesidad de duplicar el navbar en cada página.

`LandingPage` lee `location.state?.openLogin` para saber si debe abrir el modal de login automáticamente (cuando `ProtectedRoute` redirige al usuario no autenticado):

```jsx
// App.jsx — componente raíz App
const location = useLocation()
const openLogin = location.state?.openLogin ?? false
```

---

## 11. Frontend — ProtectedRoute

**Archivo:** `frontend/src/components/ProtectedRoute.jsx`

```jsx
export default function ProtectedRoute({ children }) {
    const { status } = useAuth()
    const location = useLocation()

    if (status === 'idle' || status === 'loading') {
        return (
            <div className="auth-loading">
                <div className="auth-spinner" />
            </div>
        )
    }

    if (status === 'unauthenticated') {
        return <Navigate to="/" state={{ openLogin: true, from: location }} replace />
    }

    return children
}
```

Implementa una **FSM de tres estados**:

1. **`idle` / `loading`**: La verificación de sesión inicial está en curso. Se muestra un spinner para evitar el _flash_ de contenido incorrecto (mostrar brevemente la página privada antes de redirigir).
2. **`unauthenticated`**: Redirige a `/` pasando `{ openLogin: true, from: location }` como `state` de navegación. El `from` permite implementar en el futuro una redirección post-login al recurso solicitado originalmente.
3. **`authenticated`**: Renderiza el componente hijo directamente.

---

## 12. Frontend — Componentes de autenticación

### 12.1 LoginModal

**Archivo:** `frontend/src/components/LoginModal.jsx`

Props: `isOpen`, `onClose`, `onSwitchToRegister`, `onSwitchToForgot`

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    const { ok, data } = await execute('/api/token/', {
        method: 'POST',
        body: JSON.stringify(form),
    })
    if (ok) {
        login(data.user)       // actualiza AuthContext
        handleClose()          // limpia el formulario
        navigate('/app/dashboard')
    }
}
```

Flujo: el usuario introduce email y contraseña → `useApi.execute()` llama a `POST /api/token/` → si la respuesta es `200 OK`, el backend ha establecido las cookies httpOnly en el navegador y devuelto `{ user: {...} }` → se llama a `login(data.user)` que actualiza el reducer a `authenticated` → `navigate` redirige a `/app/dashboard`.

Si hay error (401), `useApi` almacena el mensaje en `error` y el componente lo muestra mediante `{error && <p className="modal-error">{error}</p>}` al inicio del formulario.

`handleChange` usa `useCallback` con `reset()` del hook para limpiar el error al empezar a escribir:

```jsx
const handleChange = useCallback((e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    reset()   // limpia el error de la petición anterior
}, [reset])
```

### 12.2 RegisterModal

**Archivo:** `frontend/src/components/RegisterModal.jsx`

El registro es un flujo en **dos pasos** gestionado por `useState(1)`:

- **Paso 1**: Nombre, apellidos, email, contraseña — validación local (campos vacíos, longitud mínima)
- **Paso 2**: Selección de plan (standard / premium / superpro)

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (step === 1) {
        if (!form.firstName || !form.lastName || !form.email || !form.password) {
            setLocalError('Completa todos los campos')   // no alert(), sino inline
            return
        }
        if (form.password.length < 8) {
            setLocalError('La contraseña debe tener al menos 8 caracteres')
            return
        }
        setStep(2)
        return
    }

    const { ok, data } = await execute('/api/register/', {
        method: 'POST',
        body: JSON.stringify({
            email: form.email, password: form.password, role: form.plan,
            first_name: form.firstName, last_name: form.lastName,
        }),
    })

    if (ok) {
        login(data.user)          // auto-login
        handleClose()
        navigate('/app/dashboard')
    }
}
```

Los errores se muestran de forma **inline** (clase `modal-error`) en lugar de `alert()`, siguiendo el mismo patrón que `LoginModal`. Al cerrar o cambiar a login, `handleClose()` / `handleSwitchToLogin()` llaman a `resetModal()` que reinicia el step, el form y el estado del hook (`reset()`).

Los inputs incluyen `autoComplete` semánticamente correctos (`given-name`, `family-name`, `email`, `new-password`) para cumplir las directrices de accesibilidad y facilitar el autocompletado del navegador.

### 12.3 ForgotPasswordModal

**Archivo:** `frontend/src/components/ForgotPasswordModal.jsx`

Dos estados: formulario con input de email → pantalla de confirmación tras envío exitoso.

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    const { ok } = await execute('/api/password-reset/', {
        method: 'POST',
        body: JSON.stringify({ email }),
    })
    if (ok) setSent(true)
}
```

Muestra la pantalla de confirmación independientemente de si el email existe o no en la base de datos (el backend siempre responde 200), manteniendo coherencia con la política anti-enumeración del backend.

### 12.4 ResetPasswordPage

**Archivo:** `frontend/src/pages/ResetPasswordPage.jsx`

Página pública accesible en `/reset-password?uid=<uid>&token=<token>`. El usuario llega aquí desde el enlace del email de recuperación.

```jsx
const [searchParams] = useSearchParams()
const uid   = searchParams.get('uid')
const token = searchParams.get('token')

const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!uid || !token) { setLocalError('Enlace inválido o incompleto.'); return }
    if (form.new_password !== form.confirm_password) {
        setLocalError('Las contraseñas no coinciden.'); return
    }

    const { ok } = await execute('/api/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify({ uid, token, new_password: form.new_password }),
    })
    if (ok) setDone(true)
}
```

Validación local en el cliente (coincidencia de contraseñas) antes de la llamada a la API, evitando requests innecesarios. En caso de éxito, muestra una pantalla de confirmación con un botón que navega a `/?openLogin=true` para que el usuario pueda autenticarse inmediatamente.

---

## 13. Frontend — Páginas privadas

### 13.1 AppLayout y AppNavbar

**Archivos:** `frontend/src/layouts/AppLayout.jsx` · `frontend/src/components/AppNavbar.jsx`

`AppLayout` es el componente raíz de todas las rutas privadas. Su única responsabilidad es componer `AppNavbar` con `<Outlet />`:

```jsx
export default function AppLayout() {
    return (
        <div className="app-layout">
            <AppNavbar />
            <main className="app-layout__content">
                <Outlet />          // aquí se inyecta Dashboard o Profile
            </main>
        </div>
    )
}
```

`AppNavbar` usa `NavLink` (en lugar de `Link`) para aplicar automáticamente la clase `active` al enlace de la ruta actual:

```jsx
<NavLink
    to="/app/dashboard"
    className={({ isActive }) => `app-navbar__link ${isActive ? 'active' : ''}`}
>
    Dashboard
</NavLink>
```

El botón de logout llama a la acción `logout()` del contexto (que hace `POST /api/logout/` y limpia las cookies) antes de navegar a `/`:

```jsx
const handleLogout = async () => {
    await logout()
    navigate('/')
}
```

### 13.2 Dashboard

**Archivo:** `frontend/src/pages/Dashboard.jsx`

Muestra widgets de estadísticas y una tabla de reservas. Los datos actualmente son _mock_ (pendiente de implementar el endpoint `/api/bookings/`). Usa el hook `useAuth` para obtener el usuario y mostrar el plan y las horas correspondientes a través del objeto `PLAN_CONFIG`:

```jsx
const PLAN_CONFIG = {
    standard: { label: 'Standard',  hours: 40,  color: '#0071e3' },
    premium:  { label: 'Premium',   hours: 80,  color: '#8b5cf6' },
    superpro: { label: 'SuperPro',  hours: 160, color: '#f59e0b' },
}
```

### 13.3 Profile

**Archivo:** `frontend/src/pages/Profile.jsx`

Dos secciones independientes con sus propias llamadas a la API y gestión de estados de carga:

**PersonalInfoSection**: PATCH `/api/me/update/` con los campos editables del perfil. Llama a `updateUser()` del contexto para sincronizar el estado global sin necesidad de recargar:

```jsx
const { ok, data } = await execute('/api/me/update/', {
    method: 'PATCH',
    body: JSON.stringify(form),
})
if (ok) {
    updateUser(data)     // actualiza AuthContext.user parcialmente
    setSuccess(true)
}
```

**ChangePasswordSection**: POST `/api/me/change-password/`. Validación local de coincidencia de contraseñas antes de la llamada a la API.

---

## 14. Flujos completos end-to-end

### Flujo A — Registro con auto-login

```
RegisterModal (paso 1)
  → validación local (campos, longitud)
  → setStep(2)
RegisterModal (paso 2)
  → selección de plan
  → execute('POST /api/register/')
      → RegisterSerializer.validate_email() → unicidad
      → RegisterSerializer.create() → create_user() → hash password
      → RefreshToken.for_user(user)
      → _set_auth_cookies(response, refresh)
      ← HTTP 201 + Set-Cookie: access_token; Set-Cookie: refresh_token + { user }
  → login(data.user) → authReducer: LOGIN_SUCCESS
  → navigate('/app/dashboard')
  → ProtectedRoute: status=authenticated → <AppLayout /><Dashboard />
```

### Flujo B — Login

```
LoginModal
  → execute('POST /api/token/')
      → LoginSerializer.validate()
      → User.objects.get(email=...) + check_password()
      → RefreshToken.for_user(user)
      → _set_auth_cookies()
      ← HTTP 200 + Set-Cookie × 2 + { user }
  → login(data.user) → authenticated
  → navigate('/app/dashboard')
```

### Flujo C — Restauración de sesión (recarga de página)

```
Browser recarga → React monta → AuthProvider.useEffect()
  → dispatch(LOADING) → status='loading'
  → fetch('GET /api/me/', credentials:'include')
      → CookieJWTAuthentication.authenticate()
          → request.COOKIES.get('access_token')
          → AccessToken(raw_token) → validar firma + expiración
          → get_user(token) → User.objects.get(pk=token['user_id'])
      ← HTTP 200 + { user }
  → dispatch(LOGIN_SUCCESS) → status='authenticated'
  → scheduleRefresh() → setTimeout 13 min
  → ProtectedRoute: authenticated → renderiza página
```

### Flujo D — Silent refresh

```
setTimeout(13 min) dispara
  → fetch('POST /api/token/refresh/', credentials:'include')
      → RefreshTokenView.post()
          → request.COOKIES.get('refresh_token')
          → RefreshToken(raw) → ROTATE → nuevo refresh token
          → _set_auth_cookies() → nuevas cookies
      ← HTTP 200 + Set-Cookie × 2
  → scheduleRefresh() → re-programa para 13 min más
```

### Flujo E — Recuperación de contraseña

```
ForgotPasswordModal
  → execute('POST /api/password-reset/', { email })
      → PasswordResetRequestView.post()
          → User.objects.get(email=...) → si no existe: pass (sin revelar)
          → urlsafe_base64_encode(user.pk) → uid
          → default_token_generator.make_token(user) → token HMAC-SHA256
          → _send_gmail(email, subject, html con link /reset-password?uid&token)
      ← HTTP 200 + { message: 'Si el email existe...' }
  → setSent(true) → pantalla de confirmación

  [Usuario hace clic en link del email]

ResetPasswordPage ← /reset-password?uid=...&token=...
  → useSearchParams() → uid, token
  → validate: passwords coinciden
  → execute('POST /api/password-reset/confirm/')
      → PasswordResetConfirmView.post()
          → urlsafe_base64_decode(uid) → user_id
          → default_token_generator.check_token(user, token) → válido?
          → user.set_password(new_password)
          → user.save()
      ← HTTP 200 + { message }
  → setDone(true) → navigate('/', { state: { openLogin: true } })
```

---

## 15. Tabla de endpoints

| Método | URL | Auth requerida | Vista | Descripción |
|---|---|---|---|---|
| GET | `/api/health/` | No | `health_check` | Estado del servicio |
| POST | `/api/register/` | No | `RegisterView` | Crea usuario + auto-login (cookies) |
| POST | `/api/token/` | No | `LoginView` | Login → cookies JWT |
| POST | `/api/token/refresh/` | No | `RefreshTokenView` | Renueva access_token desde cookie |
| POST | `/api/logout/` | No | `LogoutView` | Elimina cookies |
| GET | `/api/me/` | Sí | `MeView` | Perfil del usuario autenticado |
| PATCH | `/api/me/update/` | Sí | `UpdateProfileView` | Actualiza nombre, teléfono, empresa |
| POST | `/api/me/change-password/` | Sí | `ChangePasswordView` | Cambia contraseña + renueva cookies |
| POST | `/api/password-reset/` | No | `PasswordResetRequestView` | Envía email con link de reset |
| POST | `/api/password-reset/confirm/` | No | `PasswordResetConfirmView` | Aplica nueva contraseña |

---

## 16. Seguridad — Decisiones de diseño

| Vector de ataque | Mitigación implementada |
|---|---|
| **XSS** (robo de token) | Tokens en cookies `HttpOnly` — JavaScript no puede acceder ni leer las cookies |
| **CSRF** | Cookies con `SameSite=Lax` — el navegador no adjunta cookies en requests cross-origin iniciados por terceros |
| **Enumeración de usuarios** (login) | Mismo mensaje de error para "email no existe" y "contraseña incorrecta" |
| **Enumeración de usuarios** (reset) | Respuesta 200 siempre, independientemente de si el email existe |
| **Exposición de contraseñas** | `write_only=True` en todos los serializers; almacenamiento con PBKDF2-SHA256 |
| **Tokens de reset reutilizados** | `default_token_generator` invalida el token tras cualquier cambio de contraseña |
| **Sesiones eternas** | Access token de 15 min; refresh token de 7 días rotante |
| **Secretos en repositorio** | Variables de entorno en `.env` excluido del `.gitignore` |
| **Acceso inter-contenedor** | Red Docker interna `workhub-net`; el frontend nunca accede directamente a MySQL |
| **Escalada de privilegios** | `UpdateProfileSerializer` no expone `email`, `role` ni `password` |

---

## 17. Panel de administración

El sistema incluye tres paneles exclusivos para usuarios con `is_staff=True` o `is_superuser=True`.

### 17.1 Acceso y redirección

Al hacer login, si el usuario es admin, el frontend lo redirige automáticamente a `/admin-analytics` en lugar de `/dashboard` (`App.jsx`):

```jsx
navigate(userData?.is_staff || userData?.is_superuser ? '/admin-analytics' : '/dashboard')
```

### 17.2 Protección de endpoints (backend)

Todos los endpoints de gestión admin están protegidos por `IsAnalyticsAdmin` (`backend/analytics/permissions.py`):

```python
class IsAnalyticsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_staff or user.is_superuser)
```

Se aplica mediante `permission_classes = [IsAnalyticsAdmin]` en cada vista o mediante `get_permissions()` para evitar imports circulares.

### 17.3 Panel de analíticas — `/admin-analytics`

**Frontend:** `frontend/src/pages/AdminAnalytics.jsx`  
**Backend:** `GET /api/analytics/admin/overview/` (`backend/analytics/views.py`)

Muestra métricas en tiempo real calculadas en el backend:

- Usuarios: total, crecimiento diario/semanal, serie de 14 días
- Distribución de planes (standard / premium / enterprise)
- Reservas: totales, activas, canceladas, finalizadas, duración media, ocupación próximos 7 días
- Salas: ocupación operativa, prime time fill rate, tasa de cancelación, heatmap por hora y día

### 17.4 Gestión de reservas — `/admin-reservations`

**Frontend:** `frontend/src/pages/AdminReservations.jsx`  
**Backend:** `backend/reservations/views.py` — `AdminReservationListView`, `AdminReservationDetailView`

**Endpoints:**

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/admin/reservations/` | Lista paginada (20/página). Filtros: `estado`, `search` (email/nombre usuario) |
| PATCH | `/api/admin/reservations/<id>/` | Cancela la reserva. Solo funciona si `estado == 'activa'` |
| DELETE | `/api/admin/reservations/<id>/` | Elimina la reserva definitivamente |

**Reglas de negocio:**
- El botón "Cancelar" solo aparece en reservas con `estado = 'activa'`
- El botón "Eliminar" está disponible en cualquier estado
- No se puede cambiar a `finalizada` ni a `activa` desde este panel

**Respuesta paginada:**
```json
{
  "count": 85,
  "num_pages": 5,
  "page": 1,
  "page_size": 20,
  "results": [...]
}
```

### 17.5 Gestión de usuarios — `/admin-users`

**Frontend:** `frontend/src/pages/AdminUsers.jsx`  
**Backend:** `backend/users/views.py` — `AdminUserListView`, `AdminUserDetailView`

**Endpoints:**

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/admin/users/` | Lista paginada (20/página). Filtros: `role`, `is_active`, `search`. Excluye staff |
| PATCH | `/api/admin/users/<id>/` | Actualiza `role`, `is_active` y/o `is_staff` |

**Campos editables desde el panel:**
- `role`: `standard` / `premium` / `enterprise`
- `is_active`: activar o desactivar la cuenta
- `is_staff`: conceder o revocar acceso admin

Los usuarios con `is_staff=True` están excluidos del listado (no se pueden editar admins desde este panel).

### 17.6 Componente de navegación admin

**Archivo:** `frontend/src/components/AdminNav.jsx`

Navbar compartido por los tres paneles. Recibe la prop `active` para marcar el enlace actual:

```jsx
<AdminNav user={user} onLogout={onLogout} active="reservations" />
// active: 'analytics' | 'reservations' | 'users'
```

---

## 18. Datos de prueba (seeds)

### 18.1 Seed de espacios

**Archivo:** `backend/spaces/management/commands/seed_spaces.py`

Crea los 18 espacios del coworking (4 salas + 14 puestos) usando `get_or_create` para ser idempotente:

```bash
docker compose exec backend python manage.py seed_spaces
```

### 18.2 Seed de usuarios y reservas demo

**Archivo:** `backend/reservations/management/commands/seed_demo.py`

Crea 6 usuarios de prueba con roles variados y genera reservas pasadas (finalizadas/canceladas, últimas 2 semanas) y futuras (activas, próximos 7 días) respetando las restricciones de plan:

- Standard: solo puestos
- Premium y SuperPro: puestos y salas

```bash
# Crear datos demo
docker compose exec backend python manage.py seed_demo

# Borrar y recrear
docker compose exec backend python manage.py seed_demo --flush
```

**Usuarios creados** (contraseña: `demo1234`):

| Email | Plan |
|-------|------|
| ana.garcia@demo.com | Standard |
| carlos.ruiz@demo.com | Premium |
| sofia.martin@demo.com | Premium |
| luis.torres@demo.com | SuperPro |
| marta.lopez@demo.com | Standard |
| pablo.sanchez@demo.com | SuperPro |

El seed es **idempotente** sin `--flush`: si un usuario demo ya existe, lo omite y continúa con las reservas.
