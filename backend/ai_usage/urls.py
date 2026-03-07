# backend/ai_usage/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("summary/", views.usage_summary),
    path("by-user/", views.usage_by_user),
    path("by-type/", views.usage_by_type),
    path("timeline/", views.usage_timeline),
    path("top-consumers/", views.usage_top_consumers),
]
