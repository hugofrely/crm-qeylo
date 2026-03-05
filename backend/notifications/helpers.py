from .models import Notification
from .email import send_notification_email


def create_notification(organization, recipient, type, title, message, link=""):
    notification = Notification.objects.create(
        organization=organization,
        recipient=recipient,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    if getattr(recipient, "email_notifications", True):
        send_notification_email(recipient.email, title, message)
    return notification
