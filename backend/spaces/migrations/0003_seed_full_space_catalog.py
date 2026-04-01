from django.db import migrations


def create_or_update_full_catalog(apps, schema_editor):
    Espacio = apps.get_model("spaces", "Espacio")

    spaces = [
        (1, "Sala Innovación", 4, "sala"),
        (2, "Sala Estrategia", 8, "sala"),
        (3, "Sala Creativa", 6, "sala"),
        (4, "Sala Ejecutiva", 12, "sala"),
        (5, "Phone Booth 1", 1, "puesto"),
        (6, "Phone Booth 2", 1, "puesto"),
        (7, "Puesto 1", 1, "puesto"),
        (8, "Puesto 2", 1, "puesto"),
        (9, "Puesto 3", 1, "puesto"),
        (10, "Puesto 4", 1, "puesto"),
        (11, "Puesto 5", 1, "puesto"),
        (12, "Puesto 6", 1, "puesto"),
        (13, "Puesto 7", 1, "puesto"),
        (14, "Puesto 8", 1, "puesto"),
        (15, "Puesto 9", 1, "puesto"),
        (16, "Puesto 10", 1, "puesto"),
        (17, "Puesto 11", 1, "puesto"),
        (18, "Puesto 12", 1, "puesto"),
    ]

    for id_, nombre, capacidad, tipo in spaces:
        Espacio.objects.update_or_create(
            id=id_,
            defaults={
                "nombre": nombre,
                "capacidad": capacidad,
                "tipo": tipo,
            },
        )


def delete_extra_catalog(apps, schema_editor):
    Espacio = apps.get_model("spaces", "Espacio")
    Espacio.objects.filter(id__gte=7, id__lte=18).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("spaces", "0002_seed_spaces"),
    ]

    operations = [
        migrations.RunPython(create_or_update_full_catalog, delete_extra_catalog),
    ]
