from rest_framework import serializers
from .models import Reserva


class ReservationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Reserva
        fields = "__all__"
        read_only_fields = ["usuario"]

    def validate(self, data):

        espacio = data["espacio"]
        inicio = data["fecha_inicio"]
        fin = data["fecha_fin"]

        reservas = Reserva.objects.filter(
            espacio=espacio,
            estado="activa",
            fecha_inicio__lt=fin,
            fecha_fin__gt=inicio
        )

        if reservas.exists():
            raise serializers.ValidationError(
                "Este espacio ya está reservado en ese horario."
            )

        return data
    
