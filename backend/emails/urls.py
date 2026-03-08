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
    # Inbox
    path("inbox/threads/", views.inbox_threads, name="inbox-threads"),
    path("inbox/threads/<uuid:thread_id>/", views.thread_emails, name="thread-emails"),
    path("inbox/emails/<uuid:email_id>/read/", views.mark_email_read, name="mark-email-read"),
    path("inbox/contacts/<uuid:contact_id>/", views.contact_emails, name="contact-emails"),
    path("inbox/sync/", views.trigger_sync, name="trigger-sync"),
    path("inbox/sync/status/", views.sync_status, name="sync-status"),
]
