from django.db import migrations


def create_spaces(apps, schema_editor):
    Espacio = apps.get_model("spaces", "Espacio")

    spaces = [
        (1, "Sala Innovación", 4, "sala"),
        (2, "Sala Estrategia", 8, "sala"),
        (3, "Sala Creativa", 6, "sala"),
        (4, "Sala Ejecutiva", 12, "sala"),
        (5, "Phone Booth 1", 1, "puesto"),
        (6, "Phone Booth 2", 1, "puesto"),
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


def delete_spaces(apps, schema_editor):
    Espacio = apps.get_model("spaces", "Espacio")
    Espacio.objects.filter(id__in=[1, 2, 3, 4, 5, 6]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("spaces", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_spaces, delete_spaces),
    ]
