from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesQuotaViewSet, quota_bulk_update

router = DefaultRouter()
router.register("", SalesQuotaViewSet, basename="quota")

urlpatterns = [
    path("bulk/", quota_bulk_update),
    path("", include(router.urls)),
]
