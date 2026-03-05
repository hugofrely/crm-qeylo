from django.contrib import admin
from .models import Segment


@admin.register(Segment)
class SegmentAdmin(admin.ModelAdmin):
    list_display = ["name", "organization", "is_pinned", "created_at"]
    list_filter = ["is_pinned"]
