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
    # Templates
    path("templates/", views.template_list_create, name="email-templates"),
    path("templates/<uuid:template_id>/", views.template_detail, name="email-template-detail"),
    path("templates/<uuid:template_id>/render/", views.template_render, name="email-template-render"),
]
