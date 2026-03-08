from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .duplicates import check_duplicates, merge_contacts, duplicate_settings
from .export import export_contacts
from companies.views import contact_relationships

router = DefaultRouter()
router.register("", views.ContactViewSet, basename="contact")

category_router = DefaultRouter()
category_router.register("", views.ContactCategoryViewSet, basename="contact-category")

custom_field_router = DefaultRouter()
custom_field_router.register("", views.CustomFieldDefinitionViewSet, basename="custom-field")

scoring_router = DefaultRouter()
scoring_router.register("", views.ScoringRuleViewSet, basename="scoring-rule")

routing_router = DefaultRouter()
routing_router.register("", views.LeadRoutingRuleViewSet, basename="routing-rule")

urlpatterns = [
    path("duplicate-settings/", duplicate_settings),
    path("check-duplicates/", check_duplicates),
    path("search/", views.search_contacts),
    path("categories/reorder/", views.reorder_categories),
    path("categories/", include(category_router.urls)),
    path("custom-fields/reorder/", views.reorder_custom_fields),
    path("custom-fields/", include(custom_field_router.urls)),
    path("<uuid:pk>/relationships/", contact_relationships),
    path("<uuid:pk>/merge/", merge_contacts),
    path("export/", export_contacts),
    path("bulk-actions/", views.bulk_actions),
    path("tags/", views.list_tags),
    path("sources/", views.list_sources),
    path("scoring-rules/", include(scoring_router.urls)),
    path("routing-rules/", include(routing_router.urls)),
    path("round-robin/", views.round_robin_settings),
    path("", include(router.urls)),
]
