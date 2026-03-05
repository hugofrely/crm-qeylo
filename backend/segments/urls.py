from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.SegmentViewSet, basename="segment")

urlpatterns = [
    path("preview/", views.segment_preview),
    path("reorder/", views.reorder_segments),
    path("<uuid:pk>/contacts/", views.segment_contacts),
    path("", include(router.urls)),
]
