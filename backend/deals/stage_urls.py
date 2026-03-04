from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PipelineStageViewSet

router = DefaultRouter()
router.register("", PipelineStageViewSet, basename="pipeline-stage")

urlpatterns = [path("", include(router.urls))]
