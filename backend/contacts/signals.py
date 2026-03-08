from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="notes.TimelineEntry")
def recalculate_score_on_timeline(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.contact_id:
        return
    from .scoring import recalculate_score
    recalculate_score(instance.contact)


@receiver(post_save, sender="notes.Call")
def recalculate_score_on_call(sender, instance, created, **kwargs):
    if not created:
        return
    from .scoring import recalculate_score
    recalculate_score(instance.contact)


@receiver(post_save, sender="deals.Deal")
def recalculate_score_on_deal(sender, instance, created, **kwargs):
    if not instance.contact_id:
        return
    from .scoring import recalculate_score
    recalculate_score(instance.contact)


@receiver(post_save, sender="contacts.Contact")
def route_lead_on_create(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.owner_id is not None:
        return
    from .routing import route_lead
    route_lead(instance)
