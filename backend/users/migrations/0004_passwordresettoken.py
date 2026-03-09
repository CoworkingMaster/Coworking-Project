import secrets
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_remove_user_rol_remove_user_suscripcion_user_role_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PasswordResetToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(default=secrets.token_urlsafe, max_length=64, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('used', models.BooleanField(default=False)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reset_tokens', to='users.user')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
