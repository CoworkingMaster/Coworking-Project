from django.utils import timezone
from rest_framework import serializers
from .models import Reserva

PREMIUM_ROOM_HOURS_LIMIT = 10


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

        # ── Verificar solapamiento ──────────────────────────────
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

        # ── Enforcement de plan ─────────────────────────────────
        request = self.context.get('request')
        if request and request.user.is_authenticated and espacio.tipo == 'sala':
            user = request.user
            role = getattr(user, 'role', 'standard')

            if role == 'standard':
                raise serializers.ValidationError(
                    "Tu plan Standard no incluye acceso a salas de reuniones. "
                    "Mejora a Premium o SuperPro para poder reservarlas."
                )

            if role == 'premium':
                now = timezone.now()
                month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                next_month = month_start.month + 1
                next_year = month_start.year + (1 if next_month > 12 else 0)
                next_month = 1 if next_month > 12 else next_month
                month_end = month_start.replace(year=next_year, month=next_month)

                sala_reservas = Reserva.objects.filter(
                    usuario=user,
                    espacio__tipo='sala',
                    estado='activa',
                    fecha_inicio__gte=month_start,
                    fecha_inicio__lt=month_end,
                )
                if self.instance:
                    sala_reservas = sala_reservas.exclude(pk=self.instance.pk)

                used_hours = sum(
                    (r.fecha_fin - r.fecha_inicio).total_seconds() / 3600
                    for r in sala_reservas
                )
                new_hours = (fin - inicio).total_seconds() / 3600
                if used_hours + new_hours > PREMIUM_ROOM_HOURS_LIMIT:
                    raise serializers.ValidationError(
                        f"Límite de {PREMIUM_ROOM_HOURS_LIMIT}h de sala/mes alcanzado en tu plan Premium "
                        f"({round(used_hours, 1)}h usadas). Mejora a SuperPro para acceso ilimitado."
                    )

        return data
    
