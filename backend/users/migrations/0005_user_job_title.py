from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_passwordresettoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='job_title',
            field=models.CharField(blank=True, max_length=120, verbose_name='cargo'),
        ),
    ]
