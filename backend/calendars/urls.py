from django.urls import path
from . import views

urlpatterns = [
    path("accounts/", views.calendar_account_list, name="calendar-accounts"),
    path("meetings/", views.meeting_list_create, name="meeting-list-create"),
    path("meetings/<uuid:pk>/", views.meeting_detail, name="meeting-detail"),
]
