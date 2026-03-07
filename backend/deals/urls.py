from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.DealViewSet, basename="deal")

loss_reason_router = DefaultRouter()
loss_reason_router.register("", views.DealLossReasonViewSet, basename="loss-reason")

urlpatterns = [
    path("pipeline/", views.pipeline_view),
    path("loss-reasons/", include(loss_reason_router.urls)),
    path("", include(router.urls)),
]
