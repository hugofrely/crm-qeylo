from django.urls import path
from . import views

urlpatterns = [
    path("comments/", views.comment_list_create, name="comment-list-create"),
    path("comments/<uuid:pk>/", views.comment_detail, name="comment-detail"),
    path("comments/<uuid:comment_id>/reactions/", views.reaction_toggle, name="reaction-toggle"),
    path("mentions/me/", views.my_mentions, name="my-mentions"),
]
