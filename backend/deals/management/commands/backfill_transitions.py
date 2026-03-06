from django.core.management.base import BaseCommand
from deals.models import Deal, DealStageTransition


class Command(BaseCommand):
    help = "Create initial transitions for existing deals that have none"

    def handle(self, *args, **options):
        deals_without = Deal.objects.exclude(
            id__in=DealStageTransition.objects.values_list("deal_id", flat=True)
        ).select_related("stage", "organization", "created_by")

        count = 0
        for deal in deals_without:
            transition = DealStageTransition.objects.create(
                deal=deal,
                organization=deal.organization,
                from_stage=None,
                to_stage=deal.stage,
                changed_by=deal.created_by,
            )
            # auto_now_add prevents setting transitioned_at on create,
            # so we update it afterwards to match the deal's creation date.
            DealStageTransition.objects.filter(pk=transition.pk).update(
                transitioned_at=deal.created_at
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {count} initial transitions"))
