from rest_framework import serializers
from .models import Reserva
from spaces.models import Espacio


class ReservationSerializer(serializers.ModelSerializer):

    usuario = serializers.HiddenField(default=serializers.CurrentUserDefault())

    espacio = serializers.PrimaryKeyRelatedField(
        queryset=Espacio.objects.all()
    )

    class Meta:
        model = Reserva
        fields = '__all__'