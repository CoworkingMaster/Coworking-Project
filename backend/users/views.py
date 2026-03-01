from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()


@api_view(['POST'])
def register(request):

    email = request.data.get('email')
    password = request.data.get('password')
    role = request.data.get('role')

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
        role=role
    )

    return Response(
        {
            "message": "Usuario creado correctamente",
            "user": {
                "email": user.email,
                "role": user.role
            }
        },
        status=status.HTTP_201_CREATED
    )