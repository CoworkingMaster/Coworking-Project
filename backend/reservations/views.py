from rest_framework import viewsets
from .models import Reserva
from .serializers import ReservationSerializer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from django.utils import timezone


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservationSerializer

    def perform_create(self, serializer):
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