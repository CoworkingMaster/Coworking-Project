from django.urls import path

from .views import AdminAnalyticsOverviewView

urlpatterns = [
    path("admin/overview/", AdminAnalyticsOverviewView.as_view(), name="admin-analytics-overview"),
]
