from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0005_organizationsettings_scoring_hot_threshold_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizationsettings",
            name="default_language",
            field=models.CharField(
                choices=[("fr", "Français"), ("en", "English")],
                default="fr",
                max_length=5,
            ),
        ),
    ]
