from django.db import migrations


def create_subscriptions(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    Subscription = apps.get_model("subscriptions", "Subscription")
    for org in Organization.objects.all():
        Subscription.objects.get_or_create(
            organization=org,
            defaults={"plan": "solo", "status": "active"},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0001_initial"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_subscriptions, migrations.RunPython.noop),
    ]
