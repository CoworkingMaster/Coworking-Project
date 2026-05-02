from collections import defaultdict
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q
from django.db.models.functions import ExtractHour, ExtractIsoWeekDay, TruncDate, TruncWeek
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from reservations.models import Reserva
from spaces.models import Espacio

from .permissions import IsAnalyticsAdmin

User = get_user_model()

ROLE_META = {
    "standard": {"label": "Standard", "color": "#0071e3"},
    "premium": {"label": "Premium", "color": "#9b59b6"},
    "enterprise": {"label": "Enterprise", "color": "#e67e22"},
}

WEEKDAY_LABELS = {
    1: "Lunes",
    2: "Martes",
    3: "Miercoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sabado",
    7: "Domingo",
}

ROOM_ANALYTICS_DAYS = 30
OPERATING_START_HOUR = 8
OPERATING_END_HOUR = 20
PRIME_TIME_WINDOWS = ((9, 11), (16, 18))


def start_of_day(local_day):
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(local_day, time.min), tz)


def build_delta(current, previous):
    delta = current - previous
    if previous > 0:
        percentage = round((delta / previous) * 100, 2)
    elif current > 0:
        percentage = 100.0
    else:
        percentage = 0.0

    if delta > 0:
        trend = "up"
    elif delta < 0:
        trend = "down"
    else:
        trend = "flat"

    return {
        "current": current,
        "previous": previous,
        "delta": delta,
        "percentage": percentage,
        "trend": trend,
    }


def serialize_series(start_date, num_days, counters):
    rows = []
    for offset in range(num_days):
        day = start_date + timedelta(days=offset)
        rows.append(
            {
                "date": day.isoformat(),
                "value": int(counters.get(day, 0)),
            }
        )
    return rows


def truncate_decimal(value, decimals=2):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return round(float(value), decimals)
    return round(float(value), decimals)


def overlapping_hours(interval_start, interval_end, window_start, window_end):
    start = max(interval_start, window_start)
    end = min(interval_end, window_end)
    if end <= start:
        return 0.0
    return (end - start).total_seconds() / 3600


def overlap_hours_for_daily_window(interval_start, interval_end, period_start, period_end, start_hour, end_hour):
    clipped_start = max(interval_start, period_start)
    clipped_end = min(interval_end, period_end)
    if clipped_end <= clipped_start:
        return 0.0

    tz = timezone.get_current_timezone()
    start_local = timezone.localtime(clipped_start, tz)
    end_local = timezone.localtime(clipped_end, tz)

    cursor_day = start_local.date()
    last_day = end_local.date()
    total = 0.0

    while cursor_day <= last_day:
        day_start = timezone.make_aware(datetime.combine(cursor_day, time.min), tz)
        window_start = day_start + timedelta(hours=start_hour)
        window_end = day_start + timedelta(hours=end_hour)
        total += overlapping_hours(clipped_start, clipped_end, window_start, window_end)
        cursor_day += timedelta(days=1)

    return total


def overlap_hours_for_prime_windows(interval_start, interval_end, period_start, period_end, windows):
    total = 0.0
    for start_hour, end_hour in windows:
        total += overlap_hours_for_daily_window(
            interval_start,
            interval_end,
            period_start,
            period_end,
            start_hour,
            end_hour,
        )
    return total


class AdminAnalyticsOverviewView(APIView):
    permission_classes = [IsAnalyticsAdmin]

    def get(self, request):
        now = timezone.now()
        today = timezone.localdate(now)

        today_start = start_of_day(today)
        tomorrow_start = today_start + timedelta(days=1)
        yesterday_start = today_start - timedelta(days=1)

        week_start = today_start - timedelta(days=today.weekday())
        next_week_start = week_start + timedelta(days=7)
        last_week_start = week_start - timedelta(days=7)

        # --- Usuarios ---
        total_users = User.objects.count()
        users_today = User.objects.filter(created_at__gte=today_start, created_at__lt=tomorrow_start).count()
        users_yesterday = User.objects.filter(created_at__gte=yesterday_start, created_at__lt=today_start).count()
        users_this_week = User.objects.filter(created_at__gte=week_start, created_at__lt=next_week_start).count()
        users_last_week = User.objects.filter(created_at__gte=last_week_start, created_at__lt=week_start).count()

        users_daily_start = today_start - timedelta(days=13)
        users_daily_rows = (
            User.objects.filter(created_at__gte=users_daily_start, created_at__lt=tomorrow_start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"))
        )
        users_daily_map = {row["day"]: row["total"] for row in users_daily_rows}

        # --- Distribucion de planes ---
        role_counts = {
            row["role"]: row["total"]
            for row in User.objects.values("role").annotate(total=Count("id"))
        }
        plan_distribution = []
        for role_key in ("standard", "premium", "enterprise"):
            count = int(role_counts.get(role_key, 0))
            percentage = round((count / total_users) * 100, 2) if total_users else 0.0
            plan_distribution.append(
                {
                    "role": role_key,
                    "label": ROLE_META[role_key]["label"],
                    "color": ROLE_META[role_key]["color"],
                    "count": count,
                    "percentage": percentage,
                }
            )

        # --- Reservas globales ---
        non_cancelled_reservations = Reserva.objects.exclude(estado="cancelada")
        reservation_totals = Reserva.objects.aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(estado="activa")),
            cancelled=Count("id", filter=Q(estado="cancelada")),
            finalized=Count("id", filter=Q(estado="finalizada")),
        )

        reservations_this_week = non_cancelled_reservations.filter(
            fecha_inicio__gte=week_start,
            fecha_inicio__lt=next_week_start,
        ).count()
        reservations_last_week = non_cancelled_reservations.filter(
            fecha_inicio__gte=last_week_start,
            fecha_inicio__lt=week_start,
        ).count()

        avg_duration_delta = non_cancelled_reservations.aggregate(
            avg_duration=Avg(
                ExpressionWrapper(
                    F("fecha_fin") - F("fecha_inicio"),
                    output_field=DurationField(),
                )
            )
        )["avg_duration"]
        avg_duration_hours = (
            round(avg_duration_delta.total_seconds() / 3600, 2)
            if avg_duration_delta
            else 0.0
        )

        reservations_daily_start = today_start - timedelta(days=13)
        reservations_daily_rows = (
            non_cancelled_reservations.filter(fecha_inicio__gte=reservations_daily_start, fecha_inicio__lt=tomorrow_start)
            .annotate(day=TruncDate("fecha_inicio"))
            .values("day")
            .annotate(total=Count("id"))
        )
        reservations_daily_map = {row["day"]: row["total"] for row in reservations_daily_rows}

        week_series_start = week_start - timedelta(weeks=11)
        reservations_weekly_rows = (
            non_cancelled_reservations.filter(fecha_inicio__gte=week_series_start, fecha_inicio__lt=next_week_start)
            .annotate(week=TruncWeek("fecha_inicio"))
            .values("week")
            .annotate(total=Count("id"))
        )
        reservations_weekly_map = {row["week"].date(): row["total"] for row in reservations_weekly_rows}
        reservations_weekly_series = []
        for idx in range(12):
            week_date = (week_series_start + timedelta(weeks=idx)).date()
            reservations_weekly_series.append(
                {
                    "week_start": week_date.isoformat(),
                    "value": int(reservations_weekly_map.get(week_date, 0)),
                }
            )

        peak_hours_rows = (
            non_cancelled_reservations.annotate(hour=ExtractHour("fecha_inicio"))
            .values("hour")
            .annotate(total=Count("id"))
        )
        peak_hours_map = {int(row["hour"]): int(row["total"]) for row in peak_hours_rows if row["hour"] is not None}
        peak_hours = [
            {
                "hour": hour,
                "label": f"{hour:02d}:00",
                "value": peak_hours_map.get(hour, 0),
            }
            for hour in range(24)
        ]

        weekday_rows = (
            non_cancelled_reservations.annotate(weekday=ExtractIsoWeekDay("fecha_inicio"))
            .values("weekday")
            .annotate(total=Count("id"))
        )
        weekday_map = {int(row["weekday"]): int(row["total"]) for row in weekday_rows if row["weekday"] is not None}
        weekday_distribution = [
            {
                "weekday": weekday,
                "label": WEEKDAY_LABELS[weekday],
                "value": weekday_map.get(weekday, 0),
            }
            for weekday in range(1, 8)
        ]

        reservation_type_rows = (
            non_cancelled_reservations.values("espacio__tipo")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        reservation_type_distribution = [
            {
                "type": row["espacio__tipo"] or "desconocido",
                "label": "Sala" if row["espacio__tipo"] == "sala" else "Puesto",
                "value": int(row["total"]),
            }
            for row in reservation_type_rows
        ]

        top_spaces = list(
            Espacio.objects.annotate(
                reservations_total=Count("reserva", filter=~Q(reserva__estado="cancelada"))
            )
            .filter(reservations_total__gt=0)
            .order_by("-reservations_total", "nombre")
            .values("id", "nombre", "tipo", "capacidad", "reservations_total")[:8]
        )
        top_rooms = [space for space in top_spaces if space["tipo"] == "sala"][:5]

        # --- Ocupacion proxima semana (activa) ---
        occupancy_window_start = now
        occupancy_window_end = now + timedelta(days=7)
        active_overlapping = Reserva.objects.filter(
            estado="activa",
            fecha_fin__gt=occupancy_window_start,
            fecha_inicio__lt=occupancy_window_end,
        ).values("fecha_inicio", "fecha_fin")

        reserved_hours_next_7d = 0.0
        for row in active_overlapping:
            reserved_hours_next_7d += overlapping_hours(
                row["fecha_inicio"],
                row["fecha_fin"],
                occupancy_window_start,
                occupancy_window_end,
            )

        spaces_total = Espacio.objects.count()
        available_hours_next_7d = spaces_total * 24 * 7
        occupancy_rate_next_7d = (
            round((reserved_hours_next_7d / available_hours_next_7d) * 100, 2)
            if available_hours_next_7d > 0
            else 0.0
        )

        # --- Analiticas de salas (uso real) ---
        room_period_end = tomorrow_start
        room_period_start = room_period_end - timedelta(days=ROOM_ANALYTICS_DAYS)

        rooms = list(
            Espacio.objects.filter(tipo="sala").values("id", "nombre", "capacidad")
        )
        room_count = len(rooms)

        room_rows = list(
            Reserva.objects.filter(
                espacio__tipo="sala",
                fecha_inicio__lt=room_period_end,
                fecha_fin__gt=room_period_start,
            )
            .values(
                "id",
                "estado",
                "fecha_inicio",
                "fecha_fin",
                "espacio_id",
                "espacio__nombre",
                "espacio__capacidad",
            )
        )

        room_metrics = {
            room["id"]: {
                "room_id": room["id"],
                "room_name": room["nombre"],
                "capacity": room["capacidad"],
                "reservations_count": 0,
                "cancellations_count": 0,
                "reserved_operational_hours": 0.0,
                "reserved_prime_hours": 0.0,
                "total_duration_hours": 0.0,
            }
            for room in rooms
        }

        operational_hours_per_day = max(OPERATING_END_HOUR - OPERATING_START_HOUR, 0)
        operational_capacity_per_room = operational_hours_per_day * ROOM_ANALYTICS_DAYS

        prime_hours_per_day = sum(max(end - start, 0) for start, end in PRIME_TIME_WINDOWS)
        prime_capacity_per_room = prime_hours_per_day * ROOM_ANALYTICS_DAYS

        total_room_reserved_operational_hours = 0.0
        total_room_reserved_prime_hours = 0.0
        room_cancelled_requests = 0
        room_non_cancelled_requests = 0

        heatmap = defaultdict(lambda: defaultdict(float))

        for row in room_rows:
            metric = room_metrics.get(row["espacio_id"])
            if metric is None:
                continue

            if row["estado"] == "cancelada":
                metric["cancellations_count"] += 1
                room_cancelled_requests += 1
                continue

            metric["reservations_count"] += 1
            room_non_cancelled_requests += 1

            start_dt = row["fecha_inicio"]
            end_dt = row["fecha_fin"]

            full_duration_hours = max((end_dt - start_dt).total_seconds() / 3600, 0)
            metric["total_duration_hours"] += full_duration_hours

            reserved_operational = overlap_hours_for_daily_window(
                start_dt,
                end_dt,
                room_period_start,
                room_period_end,
                OPERATING_START_HOUR,
                OPERATING_END_HOUR,
            )
            metric["reserved_operational_hours"] += reserved_operational
            total_room_reserved_operational_hours += reserved_operational

            reserved_prime = overlap_hours_for_prime_windows(
                start_dt,
                end_dt,
                room_period_start,
                room_period_end,
                PRIME_TIME_WINDOWS,
            )
            metric["reserved_prime_hours"] += reserved_prime
            total_room_reserved_prime_hours += reserved_prime

            local_start = timezone.localtime(start_dt)
            hour = local_start.hour
            weekday = local_start.isoweekday()
            if OPERATING_START_HOUR <= hour < OPERATING_END_HOUR:
                heatmap[weekday][hour] += 1

        room_capacity_hours_total = room_count * operational_capacity_per_room
        room_prime_capacity_hours_total = room_count * prime_capacity_per_room

        room_occupancy_operational_rate = (
            round((total_room_reserved_operational_hours / room_capacity_hours_total) * 100, 2)
            if room_capacity_hours_total > 0
            else 0.0
        )
        room_prime_time_fill_rate = (
            round((total_room_reserved_prime_hours / room_prime_capacity_hours_total) * 100, 2)
            if room_prime_capacity_hours_total > 0
            else 0.0
        )

        total_room_requests = room_non_cancelled_requests + room_cancelled_requests
        room_cancellation_rate = (
            round((room_cancelled_requests / total_room_requests) * 100, 2)
            if total_room_requests > 0
            else 0.0
        )

        room_performance = []
        for room_id, metric in room_metrics.items():
            occupancy_rate = (
                round((metric["reserved_operational_hours"] / operational_capacity_per_room) * 100, 2)
                if operational_capacity_per_room > 0
                else 0.0
            )
            room_requests = metric["reservations_count"] + metric["cancellations_count"]
            cancellation_rate = (
                round((metric["cancellations_count"] / room_requests) * 100, 2)
                if room_requests > 0
                else 0.0
            )
            avg_duration = (
                round(metric["total_duration_hours"] / metric["reservations_count"], 2)
                if metric["reservations_count"] > 0
                else 0.0
            )
            prime_time_fill = (
                round((metric["reserved_prime_hours"] / prime_capacity_per_room) * 100, 2)
                if prime_capacity_per_room > 0
                else 0.0
            )

            room_performance.append(
                {
                    "room_id": room_id,
                    "room_name": metric["room_name"],
                    "capacity": metric["capacity"],
                    "reservations_count": metric["reservations_count"],
                    "cancellations_count": metric["cancellations_count"],
                    "occupancy_rate_operational": occupancy_rate,
                    "reserved_operational_hours": truncate_decimal(metric["reserved_operational_hours"]),
                    "capacity_operational_hours": operational_capacity_per_room,
                    "cancellation_rate": cancellation_rate,
                    "average_duration_hours": avg_duration,
                    "prime_time_fill_rate": prime_time_fill,
                }
            )

        room_performance.sort(
            key=lambda item: (
                item["occupancy_rate_operational"],
                item["reservations_count"],
                -item["cancellation_rate"],
            ),
            reverse=True,
        )

        overloaded_rooms = sum(1 for item in room_performance if item["occupancy_rate_operational"] >= 80)
        underutilized_rooms = sum(1 for item in room_performance if item["occupancy_rate_operational"] <= 20)

        room_usage_heatmap = []
        for weekday in range(1, 8):
            hours = []
            for hour in range(OPERATING_START_HOUR, OPERATING_END_HOUR):
                hours.append(
                    {
                        "hour": hour,
                        "label": f"{hour:02d}:00",
                        "value": int(heatmap[weekday].get(hour, 0)),
                    }
                )
            room_usage_heatmap.append(
                {
                    "weekday": weekday,
                    "label": WEEKDAY_LABELS[weekday],
                    "hours": hours,
                }
            )

        payload = {
            "generated_at": now.isoformat(),
            "users": {
                "total": total_users,
                "daily_growth": build_delta(users_today, users_yesterday),
                "weekly_growth": build_delta(users_this_week, users_last_week),
                "daily_series_last_14_days": serialize_series(
                    users_daily_start.date(), 14, users_daily_map
                ),
            },
            "plans": {
                "distribution": plan_distribution,
            },
            "reservations": {
                "total": int(reservation_totals["total"] or 0),
                "active": int(reservation_totals["active"] or 0),
                "cancelled": int(reservation_totals["cancelled"] or 0),
                "finalized": int(reservation_totals["finalized"] or 0),
                "weekly_growth": build_delta(reservations_this_week, reservations_last_week),
                "average_duration_hours": truncate_decimal(avg_duration_hours),
                "occupancy_rate_next_7d": occupancy_rate_next_7d,
                "reserved_hours_next_7d": truncate_decimal(reserved_hours_next_7d),
                "capacity_hours_next_7d": int(available_hours_next_7d),
                "type_distribution": reservation_type_distribution,
                "top_spaces": top_spaces,
                "top_rooms": top_rooms,
                "peak_hours": peak_hours,
                "weekday_distribution": weekday_distribution,
                "daily_series_last_14_days": serialize_series(
                    reservations_daily_start.date(), 14, reservations_daily_map
                ),
                "weekly_series_last_12_weeks": reservations_weekly_series,
            },
            "rooms": {
                "period_days": ROOM_ANALYTICS_DAYS,
                "operating_window": {
                    "start_hour": OPERATING_START_HOUR,
                    "end_hour": OPERATING_END_HOUR,
                },
                "total_rooms": room_count,
                "total_requests": total_room_requests,
                "non_cancelled_requests": room_non_cancelled_requests,
                "cancelled_requests": room_cancelled_requests,
                "occupancy_rate_operational": room_occupancy_operational_rate,
                "cancellation_rate": room_cancellation_rate,
                "prime_time_fill_rate": room_prime_time_fill_rate,
                "reserved_operational_hours": truncate_decimal(total_room_reserved_operational_hours),
                "capacity_operational_hours": int(room_capacity_hours_total),
                "overloaded_rooms": overloaded_rooms,
                "underutilized_rooms": underutilized_rooms,
                "top_by_occupancy": room_performance[:5],
                "bottom_by_occupancy": sorted(room_performance, key=lambda item: item["occupancy_rate_operational"])[:5],
                "performance": room_performance,
                "usage_heatmap": room_usage_heatmap,
            },
        }

        return Response(payload)
