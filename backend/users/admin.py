from django.contrib import admin
from .models import User
from .models import Rol, Suscripcion


admin.site.register(User)
admin.site.register(Rol)
admin.site.register(Suscripcion)