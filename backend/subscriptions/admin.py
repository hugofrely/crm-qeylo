from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("organization", "plan", "status", "current_period_end")
    list_filter = ("plan", "status")
    search_fields = ("organization__name",)
