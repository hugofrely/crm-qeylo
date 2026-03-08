from .models import Notification
from .email import send_notification_email


def should_send_email(user, notification_type):
    """Check master switch AND per-type preference."""
    if not getattr(user, "email_notifications", True):
        return False
    field = f"email_notify_{notification_type}"
    return getattr(user, field, True)


def create_notification(organization, recipient, type, title, message, link=""):
    notification = Notification.objects.create(
        organization=organization,
        recipient=recipient,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    if should_send_email(recipient, type):
        send_notification_email(recipient.email, title, message, user=recipient)
    return notification
