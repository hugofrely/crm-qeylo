from django.core.management.base import BaseCommand

from companies.models import Company
from contacts.models import Contact
from deals.models import Deal
from organizations.models import Organization


class Command(BaseCommand):
    help = "Migrate existing company text field to Company entities"

    def handle(self, *args, **options):
        total_companies = 0
        total_contacts = 0
        total_deals = 0

        for org in Organization.objects.all():
            company_names = (
                Contact.objects.filter(organization=org)
                .exclude(company="")
                .values_list("company", flat=True)
                .distinct()
            )

            for name in company_names:
                company, created = Company.objects.get_or_create(
                    organization=org,
                    name=name,
                    defaults={"created_by": None},
                )
                if created:
                    total_companies += 1

                linked = Contact.objects.filter(
                    organization=org, company=name, company_entity__isnull=True,
                ).update(company_entity=company)
                total_contacts += linked

                deal_linked = Deal.objects.filter(
                    organization=org,
                    contact__company_entity=company,
                    company__isnull=True,
                ).update(company=company)
                total_deals += deal_linked

            self.stdout.write(
                f"Org {org.name}: {company_names.count()} companies"
            )

        self.stdout.write(self.style.SUCCESS(
            f"Done: {total_companies} companies created, "
            f"{total_contacts} contacts linked, "
            f"{total_deals} deals linked"
        ))
