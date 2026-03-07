from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "industry", "health_score", "organization", "created_at"]
    list_filter = ["health_score", "industry"]
    search_fields = ["name", "domain"]
