from django.urls import path
from . import views

urlpatterns = [
    path("", views.organization_list),
    path("<uuid:org_id>/members/", views.member_list),
    path("<uuid:org_id>/invite/", views.invite_member),
    path("<uuid:org_id>/members/<uuid:user_id>/", views.update_member_role),
    path("<uuid:org_id>/members/<uuid:user_id>/remove/", views.remove_member),
    path("<uuid:org_id>/settings/", views.organization_settings),
]
