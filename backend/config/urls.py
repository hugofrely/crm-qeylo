from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/organizations/", include("organizations.urls")),
    path("api/contacts/import/", include("contacts.import_urls")),
    path("api/contacts/", include("contacts.urls")),
    path("api/deals/", include("deals.urls")),
    path("api/pipeline-stages/", include("deals.stage_urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/timeline/", include("notes.urls")),
    path("api/notes/", include("notes.note_urls")),
    path("api/activities/", include("notes.activity_urls")),
    path("api/chat/", include("chat.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/email/", include("emails.urls")),
    path("api/invite/accept/<uuid:token>/", include("organizations.invite_urls")),
]
