from django.db import migrations


def create_pg_trgm(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")


def drop_pg_trgm(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("DROP EXTENSION IF EXISTS pg_trgm;")


class Migration(migrations.Migration):
    dependencies = [
        ("contacts", "0004_default_categories"),
    ]

    operations = [
        migrations.RunPython(create_pg_trgm, drop_pg_trgm),
    ]
