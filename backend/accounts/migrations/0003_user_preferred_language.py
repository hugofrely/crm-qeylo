from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_email_notifications"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="preferred_language",
            field=models.CharField(
                choices=[("fr", "Français"), ("en", "English")],
                default="fr",
                max_length=5,
            ),
        ),
    ]
