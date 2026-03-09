from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.apps import apps

ENTITY_MODELS = {
    "contact": ("contacts", "Contact"),
    "deal": ("deals", "Deal"),
    "task": ("tasks", "Task"),
}


@database_sync_to_async
def get_entity(entity_type, entity_id, organization_id):
    """Resolve entity model and verify it belongs to the given organization."""
    mapping = ENTITY_MODELS.get(entity_type)
    if not mapping:
        return None
    app_label, model_name = mapping
    model = apps.get_model(app_label, model_name)
    return model.objects.filter(pk=entity_id, organization_id=organization_id).first()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user:
            await self.close()
            return

        self.organization = self.scope.get("organization")
        if not self.organization:
            await self.close()
            return

        self.group_name = f"org_{self.organization.id}_user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        await self.send_json(event["data"])


class CollaborationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user:
            await self.close()
            return

        self.organization = self.scope.get("organization")
        if not self.organization:
            await self.close()
            return

        self.entity_type = self.scope["url_route"]["kwargs"]["entity_type"]
        self.entity_id = self.scope["url_route"]["kwargs"]["entity_id"]

        entity = await get_entity(
            self.entity_type, self.entity_id, self.organization.id
        )
        if entity is None:
            await self.close()
            return

        self.group_name = (
            f"{self.organization.id}_{self.entity_type}_{self.entity_id}"
        )

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def comment_event(self, event):
        await self.send_json(event["data"])
