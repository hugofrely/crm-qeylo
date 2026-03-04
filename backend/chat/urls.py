from django.urls import path
from . import views

urlpatterns = [
    path("message/", views.send_message),
    path("stream/", views.stream_message),
    path("history/", views.chat_history),
    path("conversations/", views.conversation_list),
    path("conversations/<uuid:conversation_id>/", views.conversation_detail),
    path("conversations/<uuid:conversation_id>/messages/", views.conversation_messages),
]
