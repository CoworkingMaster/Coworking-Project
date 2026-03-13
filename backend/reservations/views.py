from rest_framework import viewsets
from .models import Reserva
from .serializers import ReservationSerializer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservationSerializer

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


@api_view(["GET"])
def occupied_spaces(request):

    print("USER:", request.user)
    print("AUTH:", request.user.is_authenticated)
    
    fecha_inicio = request.GET.get("fecha_inicio")
    fecha_fin = request.GET.get("fecha_fin")

    if not fecha_inicio or not fecha_fin:
        return Response({
            "occupied_spaces": [],
            "my_reservations": [],
            "reservations": []
        })

    inicio = parse_datetime(fecha_inicio)
    fin = parse_datetime(fecha_fin)

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