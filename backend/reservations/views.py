from django.shortcuts import render
from rest_framework import viewsets
from .models import Reserva
from .serializers import ReservationSerializer

class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservationSerializer
    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
