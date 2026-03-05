from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .quote_pdf import quote_pdf

router = DefaultRouter()
router.register("", views.QuoteViewSet, basename="quote")

urlpatterns = [
    path("<uuid:pk>/duplicate/", views.quote_duplicate),
    path("<uuid:pk>/send/", views.quote_status_change, {"new_status": "sent"}),
    path("<uuid:pk>/accept/", views.quote_status_change, {"new_status": "accepted"}),
    path("<uuid:pk>/refuse/", views.quote_status_change, {"new_status": "refused"}),
    path("<uuid:pk>/pdf/", quote_pdf),
    path("", include(router.urls)),
]
