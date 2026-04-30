from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_user_job_title'),
    ]

    operations = [
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('billing_cycle', models.CharField(
                    choices=[('monthly', 'Mensual'), ('annual', 'Anual')],
                    default='monthly',
                    max_length=10,
                )),
                ('status', models.CharField(
                    choices=[('active', 'Activa'), ('cancelled', 'Cancelada')],
                    default='active',
                    max_length=20,
                )),
                ('current_period_start', models.DateTimeField()),
                ('current_period_end', models.DateTimeField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='subscription',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Suscripción',
                'verbose_name_plural': 'Suscripciones',
            },
        ),
        migrations.CreateModel(
            name='SubscriptionHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('plan', models.CharField(
                    choices=[('standard', 'Standard'), ('premium', 'Premium'), ('enterprise', 'Enterprise')],
                    max_length=20,
                )),
                ('billing_cycle', models.CharField(
                    choices=[('monthly', 'Mensual'), ('annual', 'Anual')],
                    max_length=10,
                )),
                ('action', models.CharField(
                    choices=[
                        ('created', 'Creada'),
                        ('upgraded', 'Mejorada'),
                        ('downgraded', 'Reducida'),
                        ('cancelled', 'Cancelada'),
                        ('reactivated', 'Reactivada'),
                        ('cycle_changed', 'Ciclo cambiado'),
                    ],
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='subscription_history',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Historial de suscripción',
                'verbose_name_plural': 'Historial de suscripciones',
                'ordering': ['-created_at'],
            },
        ),
    ]
