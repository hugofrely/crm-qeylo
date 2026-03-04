from django.contrib import admin
from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("role", "content", "user", "organization", "created_at")
    list_filter = ("role", "created_at")
    readonly_fields = ("id", "created_at")
