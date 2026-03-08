from django.db import migrations


DEFAULT_REASONS = [
    "Prix trop élevé",
    "Concurrent choisi",
    "Pas de budget",
    "Mauvais timing",
    "Pas de besoin réel",
    "Pas de réponse",
    "Autre",
]


def populate_loss_reasons(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    DealLossReason = apps.get_model("deals", "DealLossReason")

    for org in Organization.objects.all():
        for i, name in enumerate(DEFAULT_REASONS):
            DealLossReason.objects.get_or_create(
                organization=org,
                name=name,
                defaults={"order": i, "is_default": True},
            )


class Migration(migrations.Migration):

    dependencies = [
        ("deals", "0012_add_sales_quota"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(populate_loss_reasons, migrations.RunPython.noop),
    ]
