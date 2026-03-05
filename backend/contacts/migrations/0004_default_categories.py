from django.db import migrations


DEFAULT_CATEGORIES = [
    {"name": "Non contacté", "color": "#3b82f6", "order": 0},
    {"name": "Prospect", "color": "#eab308", "order": 1},
    {"name": "Qualifié", "color": "#f97316", "order": 2},
    {"name": "Client", "color": "#22c55e", "order": 3},
    {"name": "Ancien client", "color": "#ef4444", "order": 4},
    {"name": "Partenaire", "color": "#a855f7", "order": 5},
    {"name": "VIP", "color": "#f59e0b", "order": 6},
]


def create_default_categories(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    ContactCategory = apps.get_model("contacts", "ContactCategory")

    for org in Organization.objects.all():
        for cat in DEFAULT_CATEGORIES:
            ContactCategory.objects.get_or_create(
                organization=org,
                name=cat["name"],
                defaults={
                    "color": cat["color"],
                    "order": cat["order"],
                    "is_default": True,
                },
            )


def reverse(apps, schema_editor):
    ContactCategory = apps.get_model("contacts", "ContactCategory")
    ContactCategory.objects.filter(is_default=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("contacts", "0003_contact_city_contact_country_contact_custom_fields_and_more"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_default_categories, reverse),
    ]
