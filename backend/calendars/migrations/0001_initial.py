import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organizations", "0001_initial"),
        ("emails", "0001_initial"),
        ("contacts", "0001_initial"),
        ("deals", "0001_initial"),
        ("notes", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CalendarAccount",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(choices=[("google", "Google"), ("outlook", "Outlook")], max_length=10)),
                ("calendar_id", models.CharField(default="primary", max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "email_account",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="calendar_account",
                        to="emails.emailaccount",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="calendar_accounts",
                        to="organizations.organization",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="calendar_accounts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("user", "organization", "provider")},
            },
        ),
        migrations.CreateModel(
            name="Meeting",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("location", models.CharField(blank=True, max_length=500)),
                ("start_at", models.DateTimeField()),
                ("end_at", models.DateTimeField()),
                ("is_all_day", models.BooleanField(default=False)),
                ("provider_event_id", models.CharField(blank=True, max_length=255)),
                (
                    "sync_status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("synced", "Synced"),
                            ("failed", "Failed"),
                            ("not_synced", "Not Synced"),
                        ],
                        default="not_synced",
                        max_length=15,
                    ),
                ),
                ("attendees", models.JSONField(blank=True, default=list)),
                ("reminder_minutes", models.PositiveIntegerField(default=15)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "calendar_account",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="meetings",
                        to="calendars.calendaraccount",
                    ),
                ),
                (
                    "contact",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="meetings",
                        to="contacts.contact",
                    ),
                ),
                (
                    "contacts",
                    models.ManyToManyField(
                        blank=True,
                        related_name="meeting_invitations",
                        to="contacts.contact",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meetings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "deal",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="meetings",
                        to="deals.deal",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meetings",
                        to="organizations.organization",
                    ),
                ),
                (
                    "timeline_entry",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="meeting",
                        to="notes.timelineentry",
                    ),
                ),
            ],
            options={
                "ordering": ["start_at"],
            },
        ),
    ]
