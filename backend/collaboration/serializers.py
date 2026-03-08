from rest_framework import serializers
from .models import Comment, Mention, Reaction


class ReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Reaction
        fields = ["id", "user", "user_name", "emoji", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class MentionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Mention
        fields = ["id", "user", "user_name", "created_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.CharField(source="author.email", read_only=True)
    reactions = serializers.SerializerMethodField()
    mentions = MentionSerializer(source="mentions.all", many=True, read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id", "author", "author_name", "author_email",
            "content", "is_private",
            "contact", "deal", "task",
            "reactions", "mentions",
            "created_at", "updated_at", "edited_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at", "edited_at"]

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email

    def get_reactions(self, obj):
        reactions = obj.reactions.select_related("user").all()
        grouped = {}
        for r in reactions:
            if r.emoji not in grouped:
                grouped[r.emoji] = {"emoji": r.emoji, "count": 0, "users": []}
            grouped[r.emoji]["count"] += 1
            grouped[r.emoji]["users"].append({
                "id": str(r.user.id),
                "name": f"{r.user.first_name} {r.user.last_name}".strip() or r.user.email,
            })
        return list(grouped.values())


class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField()
    is_private = serializers.BooleanField(default=False)
    contact = serializers.UUIDField(required=False, allow_null=True)
    deal = serializers.UUIDField(required=False, allow_null=True)
    task = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        entity_fields = [data.get("contact"), data.get("deal"), data.get("task")]
        set_fields = [f for f in entity_fields if f is not None]
        if len(set_fields) != 1:
            raise serializers.ValidationError(
                "Exactement un champ parmi 'contact', 'deal', 'task' doit etre fourni."
            )
        return data


class ReactionCreateSerializer(serializers.Serializer):
    emoji = serializers.CharField(max_length=10)
