from django.urls import path
from . import views

urlpatterns = [
    path("", views.create_note),
    path("<uuid:pk>/", views.update_or_delete_note),
]
