from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Task


@receiver(pre_save, sender=Task)
def create_next_recurring_task(sender, instance, **kwargs):
    """When a recurring task is marked done, flag it for next occurrence creation."""
    if not instance.pk:
        return
    if not instance.is_recurring or not instance.recurrence_rule:
        return
    if not instance.is_done:
        return

    try:
        old = Task.objects.get(pk=instance.pk)
    except Task.DoesNotExist:
        return

    if old.is_done:
        return

    from .recurrence import compute_next_due_date
    next_due = compute_next_due_date(instance.due_date, instance.recurrence_rule)
    if not next_due:
        return

    instance._create_next_occurrence = {"due_date": next_due}


@receiver(post_save, sender=Task)
def handle_recurring_task_created(sender, instance, **kwargs):
    """After saving a done recurring task, create the next occurrence."""
    info = getattr(instance, "_create_next_occurrence", None)
    if not info:
        return

    del instance._create_next_occurrence

    new_task = Task.objects.create(
        organization=instance.organization,
        created_by=instance.created_by,
        description=instance.description,
        due_date=info["due_date"],
        contact=instance.contact,
        deal=instance.deal,
        priority=instance.priority,
        is_recurring=True,
        recurrence_rule=instance.recurrence_rule,
    )

    from .models import TaskAssignment
    for assignment in instance.assignments.all():
        TaskAssignment.objects.create(
            task=new_task,
            user=assignment.user,
            assigned_by=assignment.assigned_by,
        )
