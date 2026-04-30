import calendar
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Subscription, SubscriptionHistory, ROLE_CHOICES, BILLING_CYCLE_CHOICES

PLAN_RANK = {'standard': 0, 'premium': 1, 'enterprise': 2}

PLAN_PRICES = {
    'standard':   {'monthly': 49,  'annual': 39},
    'premium':    {'monthly': 99,  'annual': 79},
    'enterprise': {'monthly': 199, 'annual': 159},
}

# Horas de sala incluidas por plan (None = ilimitado)
ROOM_HOURS_LIMIT = {
    'standard': 0,
    'premium': 10,
    'enterprise': None,
}


def _next_period_end(billing_cycle, from_date=None):
    base = from_date or timezone.now()
    if billing_cycle == 'annual':
        year = base.year + 1
        day = min(base.day, calendar.monthrange(year, base.month)[1])
        return base.replace(year=year, day=day)
    month = base.month + 1
    year = base.year
    if month > 12:
        month = 1
        year += 1
    day = min(base.day, calendar.monthrange(year, month)[1])
    return base.replace(year=year, month=month, day=day)


def _get_or_create_subscription(user):
    sub, created = Subscription.objects.get_or_create(
        user=user,
        defaults={
            'billing_cycle': 'monthly',
            'status': 'active',
            'current_period_start': timezone.now(),
            'current_period_end': _next_period_end('monthly'),
        },
    )
    if created:
        SubscriptionHistory.objects.create(
            user=user,
            plan=user.role,
            billing_cycle='monthly',
            action='created',
        )
    return sub


def _get_usage(user):
    from reservations.models import Reserva

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = _next_period_end('monthly', month_start)

    my_res = Reserva.objects.filter(
        usuario=user,
        estado='activa',
        fecha_inicio__gte=month_start,
        fecha_inicio__lt=month_end,
    ).select_related('espacio')

    desk_days: set = set()
    room_hours = 0.0

    for r in my_res:
        if r.espacio.tipo == 'sala':
            delta = (r.fecha_fin - r.fecha_inicio).total_seconds() / 3600
            room_hours += max(0.0, delta)
        else:
            desk_days.add(r.fecha_inicio.date().isoformat())

    room_limit = ROOM_HOURS_LIMIT.get(user.role)
    room_rounded = round(room_hours, 1)

    return {
        'desk_days': len(desk_days),
        'room_hours': room_rounded,
        'room_hours_limit': room_limit,
        'room_hours_remaining': (
            round(max(0.0, room_limit - room_hours), 1) if room_limit is not None else None
        ),
        'month': now.strftime('%Y-%m'),
    }


def _subscription_payload(user, sub):
    prices = PLAN_PRICES.get(user.role, PLAN_PRICES['standard'])
    usage = _get_usage(user)
    history = list(
        SubscriptionHistory.objects.filter(user=user)
        .values('plan', 'billing_cycle', 'action', 'created_at')[:10]
    )
    for h in history:
        if h.get('created_at'):
            h['created_at'] = h['created_at'].isoformat()
    return {
        'plan': user.role,
        'billing_cycle': sub.billing_cycle,
        'status': sub.status,
        'current_period_start': sub.current_period_start.isoformat() if sub.current_period_start else None,
        'current_period_end': sub.current_period_end.isoformat() if sub.current_period_end else None,
        'cancelled_at': sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        'price_monthly': prices['monthly'],
        'price_annual_per_month': prices['annual'],
        'usage': usage,
        'history': history,
    }


@api_view(['GET', 'PATCH'])
def subscription_detail(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Autenticación requerida'}, status=status.HTTP_401_UNAUTHORIZED)

    user = request.user
    sub = _get_or_create_subscription(user)

    if request.method == 'GET':
        return Response(_subscription_payload(user, sub))

    # PATCH: cambiar plan y/o ciclo de facturación
    data = request.data
    new_plan = data.get('plan')
    new_cycle = data.get('billing_cycle')

    errors = {}
    if new_plan is not None and new_plan not in {c[0] for c in ROLE_CHOICES}:
        errors['plan'] = 'Plan no válido.'
    if new_cycle is not None and new_cycle not in {c[0] for c in BILLING_CYCLE_CHOICES}:
        errors['billing_cycle'] = 'Ciclo de facturación no válido.'
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    old_plan = user.role
    old_cycle = sub.billing_cycle
    changed = False

    if new_plan and new_plan != old_plan:
        user.role = new_plan
        user.save(update_fields=['role'])
        changed = True

    if new_cycle and new_cycle != old_cycle:
        sub.billing_cycle = new_cycle
        changed = True

    if changed:
        if sub.status == 'cancelled':
            sub.status = 'active'
            sub.cancelled_at = None

        sub.current_period_start = timezone.now()
        sub.current_period_end = _next_period_end(sub.billing_cycle)
        user.vigente_hasta = sub.current_period_end
        user.save(update_fields=['vigente_hasta'])
        sub.save()

        if new_plan and new_plan != old_plan:
            old_rank = PLAN_RANK.get(old_plan, 0)
            new_rank = PLAN_RANK.get(new_plan, 0)
            action = 'upgraded' if new_rank > old_rank else 'downgraded'
        else:
            action = 'cycle_changed'

        SubscriptionHistory.objects.create(
            user=user,
            plan=user.role,
            billing_cycle=sub.billing_cycle,
            action=action,
        )

    sub.refresh_from_db()
    user.refresh_from_db()
    return Response(_subscription_payload(user, sub))


@api_view(['POST'])
def subscription_cancel(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Autenticación requerida'}, status=status.HTTP_401_UNAUTHORIZED)

    user = request.user
    if user.role == 'standard':
        return Response({'error': 'Ya estás en el plan gratuito'}, status=status.HTTP_400_BAD_REQUEST)

    sub = _get_or_create_subscription(user)
    old_cycle = sub.billing_cycle

    user.role = 'standard'
    user.vigente_hasta = None
    user.save(update_fields=['role', 'vigente_hasta'])

    sub.status = 'cancelled'
    sub.cancelled_at = timezone.now()
    sub.current_period_end = timezone.now()
    sub.save()

    SubscriptionHistory.objects.create(
        user=user,
        plan='standard',
        billing_cycle=old_cycle,
        action='cancelled',
    )

    sub.refresh_from_db()
    user.refresh_from_db()
    return Response(_subscription_payload(user, sub))
