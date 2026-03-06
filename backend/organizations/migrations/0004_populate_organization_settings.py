from django.db import migrations


def create_settings(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    OrganizationSettings = apps.get_model("organizations", "OrganizationSettings")
    for org in Organization.objects.all():
        OrganizationSettings.objects.get_or_create(organization=org)


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_organizationsettings"),
    ]

    operations = [
        migrations.RunPython(create_settings, migrations.RunPython.noop),
    ]
