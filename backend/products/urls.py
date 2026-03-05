from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.ProductViewSet, basename="product")

urlpatterns = [
    path("categories/", views.ProductCategoryViewSet.as_view({"get": "list", "post": "create"})),
    path("categories/<uuid:pk>/", views.ProductCategoryViewSet.as_view({"patch": "partial_update", "delete": "destroy"})),
    path("", include(router.urls)),
]
