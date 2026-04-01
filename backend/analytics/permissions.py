from rest_framework.permissions import BasePermission


class IsAnalyticsAdmin(BasePermission):
    """
    Permite acceso solo a usuarios Django admin.
    Se considera admin si es staff o superuser.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_staff or user.is_superuser)
