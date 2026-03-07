from django.contrib import admin
from .models import AIUsageLog


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ("call_type", "model_name", "input_tokens", "output_tokens", "estimated_cost", "organization", "user", "created_at")
    list_filter = ("call_type", "model_name", "organization")
    readonly_fields = ("id", "created_at")
