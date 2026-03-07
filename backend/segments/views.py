from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.cache import cache

from .models import Segment
from .serializers import SegmentSerializer
from .engine import build_segment_queryset
from contacts.serializers import ContactSerializer

CACHE_TTL = 60  # 1 minute


class SegmentViewSet(viewsets.ModelViewSet):
    serializer_class = SegmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Segment.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        from subscriptions.permissions import require_feature
        require_feature(self.request.organization, "dynamic_segments")
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        # Add cached contact counts
        for item in data:
            cache_key = f"segment:{item['id']}:count"
            count = cache.get(cache_key)
            if count is None:
                segment = queryset.get(id=item["id"])
                qs = build_segment_queryset(request.organization, segment.rules)
                count = qs.count()
                cache.set(cache_key, count, CACHE_TTL)
            item["contact_count"] = count

        return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def segment_contacts(request, pk):
    """Get paginated contacts for a segment."""
    try:
        segment = Segment.objects.get(pk=pk, organization=request.organization)
    except Segment.DoesNotExist:
        return Response({"detail": "Segment non trouvé."}, status=404)

    qs = build_segment_queryset(request.organization, segment.rules)

    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(qs, request)
    serializer = ContactSerializer(page, many=True, context={"request": request})
    return paginator.get_paginated_response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def segment_preview(request):
    """Preview: return count for given rules without saving."""
    rules = request.data.get("rules", {})
    qs = build_segment_queryset(request.organization, rules)
    return Response({"count": qs.count()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_segments(request):
    """Reorder segments."""
    order = request.data.get("order", [])
    for index, segment_id in enumerate(order):
        Segment.objects.filter(
            id=segment_id,
            organization=request.organization,
        ).update(order=index)
    return Response({"status": "ok"})
