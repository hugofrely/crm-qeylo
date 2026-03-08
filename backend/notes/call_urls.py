from django.urls import path
from . import views

urlpatterns = [
    path("", views.call_list_create, name="call-list-create"),
    path("<uuid:pk>/", views.call_detail, name="call-detail"),
]
