import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = None
    email_notifications = models.BooleanField(default=True)
    # Granular email notification preferences
    email_notify_task_reminder = models.BooleanField(default=True)
    email_notify_task_assigned = models.BooleanField(default=True)
    email_notify_task_due = models.BooleanField(default=True)
    email_notify_daily_digest = models.BooleanField(default=True)
    email_notify_deal_update = models.BooleanField(default=True)
    email_notify_mention = models.BooleanField(default=True)
    email_notify_new_comment = models.BooleanField(default=True)
    email_notify_reaction = models.BooleanField(default=True)
    email_notify_import_complete = models.BooleanField(default=True)
    email_notify_invitation = models.BooleanField(default=True)
    email_notify_workflow = models.BooleanField(default=True)
    preferred_language = models.CharField(
        max_length=5,
        choices=[("fr", "Français"), ("en", "English")],
        default="fr",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    def __str__(self):
        return self.email
