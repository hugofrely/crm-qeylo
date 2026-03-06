from django.urls import path
from . import views

urlpatterns = [
    path("", views.trash_list, name="trash-list"),
    path("restore/", views.trash_restore, name="trash-restore"),
    path("permanent-delete/", views.trash_permanent_delete, name="trash-permanent-delete"),
    path("empty/", views.trash_empty, name="trash-empty"),
    path("counts/", views.trash_counts, name="trash-counts"),
]
