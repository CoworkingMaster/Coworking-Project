from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, PasswordResetToken


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'username')
    ordering = ('-date_joined',)

    fieldsets = UserAdmin.fieldsets + (
        (
            'WorkHub — plan / suscripción',
            {
                'fields': ('role', 'phone', 'company', 'job_title', 'vigente_hasta'),
                'description': (
                    'El plan no es un modelo aparte: está en el campo «role» del usuario '
                    '(standard, premium, enterprise). La web en /dashboard/subscription actualiza ese campo.'
                ),
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información WorkHub', {
            'fields': ('email', 'first_name', 'last_name', 'role', 'phone', 'company', 'job_title')
        }),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'created_at', 'used')
    list_filter = ('used',)
    search_fields = ('user__email',)
    readonly_fields = ('token', 'created_at')
