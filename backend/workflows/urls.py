from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"", views.WorkflowViewSet, basename="workflow")

urlpatterns = [
    path("templates/", views.workflow_templates, name="workflow-templates"),
    path("", include(router.urls)),
]
