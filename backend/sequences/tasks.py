"""Celery tasks for sequence execution."""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from emails.models import Email
from emails.service import send_email
from emails.template_rendering import build_template_context, render_email_template

from .models import Sequence, SequenceStep, SequenceEnrollment, SequenceEmail

logger = logging.getLogger(__name__)


@shared_task
def process_sequence_emails():
    """Periodic task: send scheduled sequence emails that are due."""
    now = timezone.now()
    due_emails = SequenceEmail.objects.filter(
        status=SequenceEmail.Status.SCHEDULED,
        scheduled_at__lte=now,
        enrollment__status=SequenceEnrollment.Status.ACTIVE,
        enrollment__sequence__status=Sequence.Status.ACTIVE,
    ).select_related(
        "enrollment__contact",
        "enrollment__sequence__email_account",
        "step",
    )

    for seq_email in due_emails:
        try:
            _send_sequence_email(seq_email)
        except Exception:
            logger.exception("Failed to send sequence email %s", seq_email.id)
            seq_email.status = SequenceEmail.Status.FAILED
            seq_email.save(update_fields=["status"])


def _send_sequence_email(seq_email):
    enrollment = seq_email.enrollment
    contact = enrollment.contact
    sequence = enrollment.sequence
    step = seq_email.step

    if not contact.email:
        seq_email.status = SequenceEmail.Status.FAILED
        seq_email.save(update_fields=["status"])
        return

    account = sequence.email_account
    if not account or not account.is_active:
        seq_email.status = SequenceEmail.Status.FAILED
        seq_email.save(update_fields=["status"])
        return

    context = build_template_context(contact=contact)
    subject, body_html = render_email_template(step.subject, step.body_html, context)

    try:
        sent = send_email(
            user=sequence.created_by,
            organization=sequence.organization,
            subject=subject,
            body_html=body_html,
            contact_id=str(contact.id),
            provider=account.provider,
        )

        seq_email.status = SequenceEmail.Status.SENT
        seq_email.sent_at = timezone.now()

        email_record = Email.objects.filter(
            email_account=account,
            contact=contact,
            subject=subject,
        ).order_by("-created_at").first()
        if email_record:
            seq_email.email = email_record

        seq_email.save(update_fields=["status", "sent_at", "email"])

    except Exception as e:
        logger.exception("Sequence email send failed: %s", e)
        seq_email.status = SequenceEmail.Status.FAILED
        seq_email.save(update_fields=["status"])
        return

    _advance_enrollment(enrollment, step)


def _advance_enrollment(enrollment, completed_step):
    next_step = SequenceStep.objects.filter(
        sequence=enrollment.sequence,
        order__gt=completed_step.order,
    ).first()

    if next_step:
        enrollment.current_step = next_step
        enrollment.save(update_fields=["current_step"])

        delay_hours = next_step.delay_total_hours
        scheduled_at = timezone.now() + timedelta(hours=delay_hours)

        SequenceEmail.objects.create(
            enrollment=enrollment,
            step=next_step,
            status=SequenceEmail.Status.SCHEDULED,
            scheduled_at=scheduled_at,
        )
    else:
        enrollment.status = SequenceEnrollment.Status.COMPLETED
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["status", "completed_at"])


@shared_task
def enroll_contact_in_sequence(enrollment_id: str):
    try:
        enrollment = SequenceEnrollment.objects.get(id=enrollment_id)
    except SequenceEnrollment.DoesNotExist:
        return

    first_step = enrollment.sequence.steps.first()
    if not first_step:
        return

    enrollment.current_step = first_step
    enrollment.save(update_fields=["current_step"])

    delay_hours = first_step.delay_total_hours
    scheduled_at = timezone.now() + timedelta(hours=delay_hours)

    SequenceEmail.objects.create(
        enrollment=enrollment,
        step=first_step,
        status=SequenceEmail.Status.SCHEDULED,
        scheduled_at=scheduled_at,
    )


@shared_task
def check_sequence_replies():
    active_enrollments = SequenceEnrollment.objects.filter(
        status=SequenceEnrollment.Status.ACTIVE,
    ).select_related("contact", "sequence__organization")

    for enrollment in active_enrollments:
        has_reply = Email.objects.filter(
            organization=enrollment.sequence.organization,
            contact=enrollment.contact,
            direction=Email.Direction.INBOUND,
            sent_at__gte=enrollment.enrolled_at,
        ).exists()

        if has_reply:
            enrollment.status = SequenceEnrollment.Status.REPLIED
            enrollment.completed_at = timezone.now()
            enrollment.save(update_fields=["status", "completed_at"])

            SequenceEmail.objects.filter(
                enrollment=enrollment,
                status=SequenceEmail.Status.SCHEDULED,
            ).update(status=SequenceEmail.Status.FAILED)

            logger.info("Stopped sequence for %s - contact replied", enrollment.contact)
