from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .duplicates import check_duplicates

router = DefaultRouter()
router.register("", views.ContactViewSet, basename="contact")

category_router = DefaultRouter()
category_router.register("", views.ContactCategoryViewSet, basename="contact-category")

custom_field_router = DefaultRouter()
custom_field_router.register("", views.CustomFieldDefinitionViewSet, basename="custom-field")

urlpatterns = [
    path("check-duplicates/", check_duplicates),
    path("search/", views.search_contacts),
    path("categories/reorder/", views.reorder_categories),
    path("categories/", include(category_router.urls)),
    path("custom-fields/reorder/", views.reorder_custom_fields),
    path("custom-fields/", include(custom_field_router.urls)),
    path("", include(router.urls)),
]
