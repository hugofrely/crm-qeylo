from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PipelineViewSet, reorder_pipelines

router = DefaultRouter()
router.register("", PipelineViewSet, basename="pipeline")

urlpatterns = [
    path("reorder/", reorder_pipelines),
    path("", include(router.urls)),
]
