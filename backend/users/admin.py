from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, PasswordResetToken, Subscription, SubscriptionHistory


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


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan_display', 'billing_cycle', 'status', 'current_period_end', 'updated_at')
    list_filter = ('billing_cycle', 'status')
    search_fields = ('user__email',)
    readonly_fields = ('created_at', 'updated_at')

    def plan_display(self, obj):
        return obj.user.role
    plan_display.short_description = 'Plan'


@admin.register(SubscriptionHistory)
class SubscriptionHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'plan', 'billing_cycle', 'created_at')
    list_filter = ('action', 'plan', 'billing_cycle')
    search_fields = ('user__email',)
    readonly_fields = ('user', 'plan', 'billing_cycle', 'action', 'created_at')
