from django.urls import path
from . import views

urlpatterns = [
    path("message/", views.send_message),
    path("history/", views.chat_history),
]
