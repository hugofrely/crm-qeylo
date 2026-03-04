from rest_framework import serializers
from .models import ChatMessage, Conversation


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "actions", "created_at"]
        read_only_fields = fields


class ChatInputSerializer(serializers.Serializer):
    message = serializers.CharField()
    conversation_id = serializers.UUIDField(required=False)


class ConversationSerializer(serializers.ModelSerializer):
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at", "last_message_preview"]
        read_only_fields = ["id", "created_at", "updated_at", "last_message_preview"]

    def get_last_message_preview(self, obj):
        last_msg = obj.messages.order_by("-created_at").first()
        if last_msg:
            return last_msg.content[:80]
        return None
