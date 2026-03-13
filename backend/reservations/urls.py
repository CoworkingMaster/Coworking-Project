from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReservationViewSet, occupied_spaces

router = DefaultRouter()
router.register(r'', ReservationViewSet)

urlpatterns = [
    path("occupied/", occupied_spaces),
    path("", include(router.urls)),
]