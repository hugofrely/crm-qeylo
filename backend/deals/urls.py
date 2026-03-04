from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.DealViewSet, basename="deal")

urlpatterns = [
    path("pipeline/", views.pipeline_view),
    path("", include(router.urls)),
]
