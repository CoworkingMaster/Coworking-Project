from rest_framework import serializers
from .models import Reserva


class ReservationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Reserva
        fields = "__all__"
        read_only_fields = ["usuario"]

    def validate(self, data):

        if self.instance is not None:
            espacio = data.get("espacio", self.instance.espacio)
            inicio = data.get("fecha_inicio", self.instance.fecha_inicio)
            fin = data.get("fecha_fin", self.instance.fecha_fin)
        else:
            espacio = data.get("espacio")
            inicio = data.get("fecha_inicio")
            fin = data.get("fecha_fin")

        if espacio is None or inicio is None or fin is None:
            return data

        if data.get('estado') == 'cancelada' or getattr(self.instance, 'estado', '') == 'cancelada':
            return data

        reservas = Reserva.objects.filter(
            espacio=espacio,
            estado="activa",
            fecha_inicio__lt=fin,
            fecha_fin__gt=inicio
        )

        if self.instance is not None:
            reservas = reservas.exclude(pk=self.instance.pk)

        if reservas.exists():
            raise serializers.ValidationError(
                "Este espacio ya está reservado en ese horario."
            )

        return data
    
