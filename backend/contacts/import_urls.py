from django.urls import path
from . import import_views

urlpatterns = [
    path("preview/", import_views.import_preview),
    path("", import_views.import_contacts),
]
