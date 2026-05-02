from rest_framework import viewsets
from .models import Reserva
from .serializers import ReservationSerializer
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from users.subscription import PREMIUM_ROOM_HOURS, ensure_paid_cycle, overlap_hours


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Debes iniciar sesión para reservar.")

        espacio = serializer.validated_data.get("espacio")
        fecha_inicio = serializer.validated_data.get("fecha_inicio")
        fecha_fin = serializer.validated_data.get("fecha_fin")
        estado = serializer.validated_data.get("estado")

        if espacio and espacio.tipo == "sala" and estado != "cancelada":
            if user.role == "standard":
                raise PermissionDenied(
                    "Tu plan Standard no incluye salas. Mejora a Premium o SuperPro para reservar salas."
                )

            if user.role == "premium":
                cycle_start, cycle_end = ensure_paid_cycle(user, now=timezone.now(), persist=True)
                used_hours = 0.0
                reserved_qs = Reserva.objects.filter(
                    usuario=user,
                    estado__in=["activa", "finalizada"],
                    espacio__tipo="sala",
                )

                for reserva in reserved_qs:
                    used_hours += overlap_hours(
                        reserva.fecha_inicio,
                        reserva.fecha_fin,
                        cycle_start,
                        cycle_end,
                    )

                requested_hours = overlap_hours(fecha_inicio, fecha_fin, cycle_start, cycle_end)
                projected_hours = used_hours + requested_hours
                if projected_hours > PREMIUM_ROOM_HOURS:
                    raise PermissionDenied(
                        (
                            f"Has alcanzado el límite de {int(PREMIUM_ROOM_HOURS)}h de salas en tu ciclo actual. "
                            f"Llevas {round(used_hours, 2)}h y esta reserva subiría a {round(projected_hours, 2)}h. "
                            "Puedes esperar al próximo ciclo o mejorar a SuperPro."
                        )
                    )

        serializer.save(usuario=self.request.user)


def make_aware_safe(dt):
    """Convierte un datetime naive a aware usando la zona horaria configurada."""
    if dt is None:
        return None
    if timezone.is_aware(dt):
        return dt
    return timezone.make_aware(dt)


@api_view(["GET"])
def occupied_spaces(request):

    fecha_inicio = request.GET.get("fecha_inicio")
    fecha_fin = request.GET.get("fecha_fin")

    if not fecha_inicio or not fecha_fin:
        return Response({
            "occupied_spaces": [],
            "my_reservations": [],
            "reservations": []
        })

    inicio = make_aware_safe(parse_datetime(fecha_inicio))
    fin    = make_aware_safe(parse_datetime(fecha_fin))

    if inicio is None or fin is None:
        return Response({
            "occupied_spaces": [],
            "my_reservations": [],
            "reservations": []
        })

    reservas = Reserva.objects.filter(
        estado="activa",
        fecha_inicio__lt=fin,
        fecha_fin__gt=inicio
    )

    occupied = []
    mine = []
    reservations = []

    for r in reservas:

        occupied.append(r.espacio_id)

        reservations.append({
            "espacio": r.espacio_id,
            "inicio": r.fecha_inicio,
            "fin": r.fecha_fin
        })

        if r.usuario == request.user:
            mine.append(r.espacio_id)

    return Response({
        "occupied_spaces": list(set(occupied)),
        "my_reservations": list(set(mine)),
        "reservations": reservations
    })
