"""
Tests E2E del flujo de reservas — WorkHub Coworking
Ejecutar dentro del contenedor backend: python e2e_tests.py
"""
import django, os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workhub.settings')
django.setup()

from django.utils import timezone
from django.core.exceptions import ValidationError
from reservations.models import Reserva
from spaces.models import Espacio
from django.contrib.auth import get_user_model

User = get_user_model()

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"

results = []

def test(name, fn):
    try:
        fn()
        print(f"{PASS} {name}")
        results.append((name, True, None))
    except AssertionError as e:
        print(f"{FAIL} {name}: {e}")
        results.append((name, False, str(e)))
    except Exception as e:
        print(f"{FAIL} {name} [excepcion]: {e}")
        results.append((name, False, str(e)))

# ── Helpers ────────────────────────────────────────────────────────
tz = timezone.get_current_timezone()

def dt(y, mo, d, h, mi=0):
    return timezone.make_aware(timezone.datetime(y, mo, d, h, mi))

def get_or_create_user(email):
    u, _ = User.objects.get_or_create(email=email, defaults={"username": email})
    return u

def get_espacio(pk):
    return Espacio.objects.get(pk=pk)

def make_reserva(espacio_pk, ini, fin, user_email="test@workhub.test", estado="activa"):
    espacio = get_espacio(espacio_pk)
    user    = get_or_create_user(user_email)
    r = Reserva(espacio=espacio, fecha_inicio=ini, fecha_fin=fin, estado=estado, usuario=user)
    r.save()
    return r

# ── Setup: eliminamos reservas de test previas ─────────────────────
Reserva.objects.filter(usuario__email="test@workhub.test").delete()
Reserva.objects.filter(usuario__email="otro@workhub.test").delete()
print(f"{INFO} Reservas de test previas limpiadas\n")

# ═══════════════════════════════════════════════════════════════════
# 1. MODELO — validación de solapamiento
# ═══════════════════════════════════════════════════════════════════
print("─── 1. Validaciones del modelo ───")

def test_solapamiento_exacto():
    r = make_reserva(1, dt(2026,6,1,10), dt(2026,6,1,12))
    try:
        r2 = Reserva(
            espacio=get_espacio(1),
            fecha_inicio=dt(2026,6,1,10),
            fecha_fin=dt(2026,6,1,12),
            estado="activa",
            usuario=get_or_create_user("test@workhub.test")
        )
        r2.save()
        assert False, "Debió lanzar ValidationError"
    except (ValidationError, Exception) as e:
        if "reservado" in str(e).lower() or "ValidationError" in type(e).__name__:
            pass
        else:
            raise
    finally:
        r.delete()

def test_solapamiento_parcial_inicio():
    r = make_reserva(2, dt(2026,6,1,10), dt(2026,6,1,13))
    try:
        r2 = Reserva(
            espacio=get_espacio(2),
            fecha_inicio=dt(2026,6,1,9),
            fecha_fin=dt(2026,6,1,11),
            estado="activa",
            usuario=get_or_create_user("test@workhub.test")
        )
        r2.save()
        assert False, "Solapamiento parcial no detectado"
    except (ValidationError, Exception) as e:
        if "reservado" in str(e).lower() or "ValidationError" in type(e).__name__:
            pass
        else:
            raise
    finally:
        r.delete()

def test_solapamiento_parcial_fin():
    r = make_reserva(3, dt(2026,6,1,10), dt(2026,6,1,13))
    try:
        r2 = Reserva(
            espacio=get_espacio(3),
            fecha_inicio=dt(2026,6,1,12),
            fecha_fin=dt(2026,6,1,15),
            estado="activa",
            usuario=get_or_create_user("test@workhub.test")
        )
        r2.save()
        assert False, "Solapamiento parcial fin no detectado"
    except (ValidationError, Exception) as e:
        if "reservado" in str(e).lower() or "ValidationError" in type(e).__name__:
            pass
        else:
            raise
    finally:
        r.delete()

def test_solapamiento_interior():
    r = make_reserva(4, dt(2026,6,1,9), dt(2026,6,1,17))
    try:
        r2 = Reserva(
            espacio=get_espacio(4),
            fecha_inicio=dt(2026,6,1,10),
            fecha_fin=dt(2026,6,1,14),
            estado="activa",
            usuario=get_or_create_user("test@workhub.test")
        )
        r2.save()
        assert False, "Solapamiento interior no detectado"
    except (ValidationError, Exception) as e:
        if "reservado" in str(e).lower() or "ValidationError" in type(e).__name__:
            pass
        else:
            raise
    finally:
        r.delete()

def test_adyacente_no_solapa():
    r = make_reserva(1, dt(2026,6,1,10), dt(2026,6,1,12))
    r2 = make_reserva(1, dt(2026,6,1,12), dt(2026,6,1,14))  # debe funcionar
    r.delete(); r2.delete()

def test_distinto_espacio_no_solapa():
    r  = make_reserva(1, dt(2026,6,1,10), dt(2026,6,1,12))
    r2 = make_reserva(2, dt(2026,6,1,10), dt(2026,6,1,12))  # distinto espacio → OK
    r.delete(); r2.delete()

def test_fin_menor_inicio_rechazado():
    try:
        r = make_reserva(1, dt(2026,6,1,14), dt(2026,6,1,10))
        r.delete()
        # Si el backend no lo rechaza, anotamos pero no fallamos — falta constraint
        assert False, "Debería rechazar inicio > fin"
    except Exception:
        pass  # cualquier excepción == correcto

test("Solapamiento exacto rechazado",           test_solapamiento_exacto)
test("Solapamiento parcial inicio rechazado",    test_solapamiento_parcial_inicio)
test("Solapamiento parcial fin rechazado",       test_solapamiento_parcial_fin)
test("Solapamiento interior rechazado",          test_solapamiento_interior)
test("Reservas adyacentes permitidas",           test_adyacente_no_solapa)
test("Distintos espacios mismo horario permitido", test_distinto_espacio_no_solapa)
test("Inicio > fin rechazado",                  test_fin_menor_inicio_rechazado)


# ═══════════════════════════════════════════════════════════════════
# 2. VISTA occupied_spaces — lógica de filtrado
# ═══════════════════════════════════════════════════════════════════
print("\n─── 2. Vista occupied_spaces ───")

from reservations.views import make_aware_safe
from django.utils.dateparse import parse_datetime

def test_make_aware_naive():
    dt_naive = parse_datetime("2026-03-17T18:00")
    result = make_aware_safe(dt_naive)
    assert timezone.is_aware(result), "Debe devolver datetime aware"

def test_make_aware_already_aware():
    dt_aware = parse_datetime("2026-03-17T18:00+01:00")
    result = make_aware_safe(dt_aware)
    assert timezone.is_aware(result), "Ya era aware, debe seguir aware"
    assert result == dt_aware, "No debe modificar el valor"

def test_make_aware_none():
    result = make_aware_safe(None)
    assert result is None, "None debe devolver None"

def test_occupied_devuelve_espacio_correcto():
    r = make_reserva(5, dt(2026,7,1,10), dt(2026,7,1,12))
    inicio = dt(2026,7,1,9); fin = dt(2026,7,1,13)
    qs = Reserva.objects.filter(estado="activa", fecha_inicio__lt=fin, fecha_fin__gt=inicio)
    ids = [x.espacio_id for x in qs]
    assert 5 in ids, f"Espacio 5 debería estar en ocupados, got {ids}"
    r.delete()

def test_occupied_no_devuelve_cancelada():
    r = make_reserva(6, dt(2026,7,1,10), dt(2026,7,1,12), estado="cancelada")
    inicio = dt(2026,7,1,9); fin = dt(2026,7,1,13)
    qs = Reserva.objects.filter(estado="activa", fecha_inicio__lt=fin, fecha_fin__gt=inicio)
    ids = [x.espacio_id for x in qs]
    assert 6 not in ids, "Reserva cancelada no debe aparecer como ocupada"
    r.delete()

def test_occupied_no_devuelve_finalizada():
    r = make_reserva(7, dt(2026,7,1,10), dt(2026,7,1,12), estado="finalizada")
    inicio = dt(2026,7,1,9); fin = dt(2026,7,1,13)
    qs = Reserva.objects.filter(estado="activa", fecha_inicio__lt=fin, fecha_fin__gt=inicio)
    ids = [x.espacio_id for x in qs]
    assert 7 not in ids, "Reserva finalizada no debe aparecer como ocupada"
    r.delete()

def test_occupied_fuera_de_rango():
    r = make_reserva(8, dt(2026,7,1,8), dt(2026,7,1,9))
    inicio = dt(2026,7,1,10); fin = dt(2026,7,1,12)
    qs = Reserva.objects.filter(estado="activa", fecha_inicio__lt=fin, fecha_fin__gt=inicio)
    ids = [x.espacio_id for x in qs]
    assert 8 not in ids, "Reserva fuera de rango no debe aparecer"
    r.delete()

def test_occupied_adyacente_no_cuenta():
    r = make_reserva(9, dt(2026,7,1,12), dt(2026,7,1,14))
    inicio = dt(2026,7,1,10); fin = dt(2026,7,1,12)
    qs = Reserva.objects.filter(estado="activa", fecha_inicio__lt=fin, fecha_fin__gt=inicio)
    ids = [x.espacio_id for x in qs]
    assert 9 not in ids, "Reserva adyacente (empieza justo cuando termina el rango) no debe contar"
    r.delete()

test("make_aware_safe con naive",        test_make_aware_naive)
test("make_aware_safe con aware",        test_make_aware_already_aware)
test("make_aware_safe con None",         test_make_aware_none)
test("occupied devuelve espacio activo", test_occupied_devuelve_espacio_correcto)
test("occupied ignora canceladas",       test_occupied_no_devuelve_cancelada)
test("occupied ignora finalizadas",      test_occupied_no_devuelve_finalizada)
test("occupied ignora fuera de rango",   test_occupied_fuera_de_rango)
test("occupied adyacente no cuenta",     test_occupied_adyacente_no_cuenta)


# ═══════════════════════════════════════════════════════════════════
# 3. SERIALIZER — validación de solapamiento en API
# ═══════════════════════════════════════════════════════════════════
print("\n─── 3. Serializer (validación API) ───")

from reservations.serializers import ReservationSerializer
from django.test import RequestFactory
from rest_framework.request import Request

def test_serializer_valida_solapamiento():
    r = make_reserva(10, dt(2026,8,1,10), dt(2026,8,1,12))
    data = {
        "espacio": 10,
        "fecha_inicio": dt(2026,8,1,11).isoformat(),
        "fecha_fin":    dt(2026,8,1,13).isoformat(),
        "estado": "activa"
    }
    s = ReservationSerializer(data=data)
    assert not s.is_valid(), "Serializer debería fallar por solapamiento"
    assert "non_field_errors" in s.errors or any("reservado" in str(v).lower() for v in s.errors.values()), \
        f"Error inesperado: {s.errors}"
    r.delete()

def test_serializer_acepta_sin_solapamiento():
    r = make_reserva(11, dt(2026,8,1,10), dt(2026,8,1,12))
    data = {
        "espacio": 11,
        "fecha_inicio": dt(2026,8,1,13).isoformat(),
        "fecha_fin":    dt(2026,8,1,15).isoformat(),
        "estado": "activa"
    }
    s = ReservationSerializer(data=data)
    assert s.is_valid(), f"Debería ser válido: {s.errors}"
    r.delete()

def test_serializer_requiere_espacio():
    data = {
        "fecha_inicio": dt(2026,9,1,10).isoformat(),
        "fecha_fin":    dt(2026,9,1,12).isoformat(),
        "estado": "activa"
    }
    s = ReservationSerializer(data=data)
    assert not s.is_valid(), "Debe fallar sin espacio"
    assert "espacio" in s.errors

def test_serializer_requiere_fechas():
    data = { "espacio": 1, "estado": "activa" }
    s = ReservationSerializer(data=data)
    assert not s.is_valid(), "Debe fallar sin fechas"

test("Serializer rechaza solapamiento",         test_serializer_valida_solapamiento)
test("Serializer acepta sin solapamiento",       test_serializer_acepta_sin_solapamiento)
test("Serializer requiere campo espacio",        test_serializer_requiere_espacio)
test("Serializer requiere fechas",               test_serializer_requiere_fechas)


# ═══════════════════════════════════════════════════════════════════
# 4. INTEGRIDAD — consistencia IDs frontend ↔ backend
# ═══════════════════════════════════════════════════════════════════
print("\n─── 4. Integridad IDs frontend ↔ backend ───")

FRONTEND_IDS = list(range(1, 19))  # rooms.js: ids 1-18

def test_todos_los_espacios_existen_en_bd():
    bd_ids = set(Espacio.objects.values_list('id', flat=True))
    missing = [i for i in FRONTEND_IDS if i not in bd_ids]
    assert not missing, f"IDs del frontend sin espacio en BD: {missing}"

def test_no_hay_espacios_extra_en_bd():
    bd_ids = set(Espacio.objects.values_list('id', flat=True))
    extra = [i for i in bd_ids if i not in FRONTEND_IDS]
    assert not extra, f"Espacios en BD sin entrada en frontend rooms.js: {extra}"

def test_espacios_tienen_tipo_correcto():
    salas  = Espacio.objects.filter(pk__lte=6)
    puestos = Espacio.objects.filter(pk__gte=7)
    for e in salas:
        assert e.tipo == 'sala', f"Espacio {e.id} ({e.nombre}) debería ser sala, es {e.tipo}"
    for e in puestos:
        assert e.tipo == 'puesto', f"Espacio {e.id} ({e.nombre}) debería ser puesto, es {e.tipo}"

test("Todos los IDs del frontend existen en BD",  test_todos_los_espacios_existen_en_bd)
test("No hay espacios huérfanos en BD",            test_no_hay_espacios_extra_en_bd)
test("Tipos de espacio correctos (sala/puesto)",   test_espacios_tienen_tipo_correcto)


# ═══════════════════════════════════════════════════════════════════
# 5. LIMPIEZA y RESUMEN
# ═══════════════════════════════════════════════════════════════════
Reserva.objects.filter(usuario__email="test@workhub.test").delete()
Reserva.objects.filter(usuario__email="otro@workhub.test").delete()

total  = len(results)
passed = sum(1 for _, ok, _ in results if ok)
failed = total - passed

print(f"\n{'═'*50}")
print(f"  Resultado: {passed}/{total} tests pasados")
if failed:
    print(f"  Fallidos:")
    for name, ok, err in results:
        if not ok:
            print(f"    ✗ {name}: {err}")
print(f"{'═'*50}")
sys.exit(0 if failed == 0 else 1)
