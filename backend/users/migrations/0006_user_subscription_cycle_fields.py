from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_user_job_title"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="subscription_cycle_end",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="subscription_cycle_start",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
