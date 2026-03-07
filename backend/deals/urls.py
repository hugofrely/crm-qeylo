from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.DealViewSet, basename="deal")

loss_reason_router = DefaultRouter()
loss_reason_router.register("", views.DealLossReasonViewSet, basename="loss-reason")

urlpatterns = [
    path("pipeline/", views.pipeline_view),
    path("forecast/", views.forecast_view),
    path("win-loss/", views.win_loss_view),
    path("velocity/", views.velocity_view),
    path("leaderboard/", views.leaderboard_view),
    path("loss-reasons/", include(loss_reason_router.urls)),
    path("<uuid:pk>/next-actions/", views.next_actions_view),
    path("<uuid:pk>/next-actions/ai/", views.next_actions_ai_view),
    path("", include(router.urls)),
]
