from django.urls import path
from . import views

urlpatterns = [
    # OAuth
    path("connect/gmail/", views.connect_gmail, name="email-connect-gmail"),
    path("callback/gmail/", views.callback_gmail, name="email-callback-gmail"),
    path("connect/outlook/", views.connect_outlook, name="email-connect-outlook"),
    path("callback/outlook/", views.callback_outlook, name="email-callback-outlook"),
    # Account management
    path("accounts/", views.list_accounts, name="email-accounts"),
    path("accounts/<uuid:account_id>/", views.disconnect_account, name="email-disconnect"),
    # Send
    path("send/", views.send_email_view, name="email-send"),
]
