from rest_framework import viewsets
from .models import Reserva
from .serializers import ReservationSerializer
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from users.subscription import PREMIUM_ROOM_HOURS, ensure_paid_cycle, overlap_hours
from analytics.permissions import IsAnalyticsAdmin


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


PAGE_SIZE = 20


class AdminReservationListView(APIView):
    permission_classes = [IsAnalyticsAdmin]

    def get(self, request):
        qs = Reserva.objects.select_related('usuario', 'espacio').order_by('-fecha_inicio')

        estado = request.GET.get('estado', '').strip()
        search = request.GET.get('search', '').strip()

        if estado:
            qs = qs.filter(estado=estado)
        if search:
            qs = qs.filter(
                Q(usuario__email__icontains=search) |
                Q(usuario__first_name__icontains=search) |
                Q(usuario__last_name__icontains=search)
            )

        total = qs.count()
        try:
            page = max(1, int(request.GET.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        num_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
        page = min(page, num_pages)
        offset = (page - 1) * PAGE_SIZE
        qs = qs[offset: offset + PAGE_SIZE]

        results = [
            {
                'id': r.pk,
                'usuario_id': r.usuario_id,
                'usuario_email': r.usuario.email,
                'usuario_nombre': f"{r.usuario.first_name} {r.usuario.last_name}".strip() or r.usuario.username,
                'espacio_id': r.espacio_id,
                'espacio_nombre': r.espacio.nombre,
                'espacio_tipo': r.espacio.tipo,
                'espacio_capacidad': r.espacio.capacidad,
                'fecha_inicio': r.fecha_inicio.isoformat(),
                'fecha_fin': r.fecha_fin.isoformat(),
                'estado': r.estado,
            }
            for r in qs
        ]
        return Response({'count': total, 'num_pages': num_pages, 'page': page, 'page_size': PAGE_SIZE, 'results': results})


class AdminReservationDetailView(APIView):
    permission_classes = [IsAnalyticsAdmin]

    def patch(self, request, pk):
        reserva = get_object_or_404(Reserva, pk=pk)
        if reserva.estado != 'activa':
            return Response({'error': 'Solo se pueden cancelar reservas activas.'}, status=status.HTTP_400_BAD_REQUEST)
        reserva.estado = 'cancelada'
        reserva.save(update_fields=['estado'])
        return Response({'id': reserva.pk, 'estado': reserva.estado})

    def delete(self, request, pk):
        reserva = get_object_or_404(Reserva, pk=pk)
        reserva.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
