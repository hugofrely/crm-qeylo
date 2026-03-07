from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.CompanyViewSet, basename="company")

urlpatterns = [
    path("contact-relationships/<uuid:pk>/", views.delete_contact_relationship),
    path("<uuid:pk>/contacts/", views.company_contacts),
    path("<uuid:pk>/deals/", views.company_deals),
    path("<uuid:pk>/subsidiaries/", views.company_subsidiaries),
    path("<uuid:pk>/hierarchy/", views.company_hierarchy),
    path("<uuid:pk>/stats/", views.company_stats),
    path("<uuid:pk>/org-chart/", views.company_org_chart),
    path("<uuid:pk>/timeline/", views.company_timeline),
    path("", include(router.urls)),
]
