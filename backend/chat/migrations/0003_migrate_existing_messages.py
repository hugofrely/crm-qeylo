from django.db import migrations


def migrate_existing_messages(apps, schema_editor):
    ChatMessage = apps.get_model("chat", "ChatMessage")
    Conversation = apps.get_model("chat", "Conversation")

    # Group orphan messages by (user_id, organization_id)
    orphan_messages = ChatMessage.objects.filter(conversation__isnull=True)
    pairs = orphan_messages.values_list(
        "user_id", "organization_id"
    ).distinct()

    for user_id, org_id in pairs:
        conv = Conversation.objects.create(
            user_id=user_id,
            organization_id=org_id,
            title="Conversation précédente",
        )
        orphan_messages.filter(
            user_id=user_id, organization_id=org_id
        ).update(conversation=conv)


def reverse_migration(apps, schema_editor):
    ChatMessage = apps.get_model("chat", "ChatMessage")
    ChatMessage.objects.all().update(conversation=None)


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0002_conversation_chatmessage_conversation"),
    ]

    operations = [
        migrations.RunPython(migrate_existing_messages, reverse_migration),
    ]
