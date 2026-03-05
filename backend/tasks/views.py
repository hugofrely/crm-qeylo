from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def _base_queryset(self):
        return Task.objects.filter(
            organization=self.request.organization
        ).select_related("contact", "deal")

    def get_queryset(self):
        qs = self._base_queryset()
        params = self.request.query_params

        contact_id = params.get("contact")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)

        is_done = params.get("is_done")
        if is_done == "true":
            qs = qs.filter(is_done=True)
        elif is_done == "false":
            qs = qs.filter(is_done=False)

        priority = params.get("priority")
        if priority in ("high", "normal", "low"):
            qs = qs.filter(priority=priority)

        due_date = params.get("due_date")
        if due_date:
            now = timezone.now()
            if due_date == "overdue":
                qs = qs.filter(due_date__lt=now, is_done=False)
            elif due_date == "today":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=1)
                qs = qs.filter(due_date__gte=start, due_date__lt=end)
            elif due_date == "this_week":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                start -= timedelta(days=start.weekday())
                end = start + timedelta(days=7)
                qs = qs.filter(due_date__gte=start, due_date__lt=end)

        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        base_qs = self._base_queryset()
        response.data["todo_count"] = base_qs.filter(is_done=False).count()
        response.data["done_count"] = base_qs.filter(is_done=True).count()
        return response

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )
