from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.SequenceViewSet, basename="sequences")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "<uuid:sequence_id>/steps/<uuid:step_id>/",
        views.step_detail,
        name="sequence-step-detail",
    ),
    path(
        "enrollments/<uuid:enrollment_id>/unenroll/",
        views.unenroll_contact,
        name="sequence-unenroll",
    ),
]
