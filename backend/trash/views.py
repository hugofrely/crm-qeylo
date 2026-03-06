from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task


MODEL_MAP = {
    "contact": Contact,
    "deal": Deal,
    "task": Task,
}


def _get_name(obj):
    if hasattr(obj, "name"):
        return obj.name
    if hasattr(obj, "first_name"):
        return f"{obj.first_name} {obj.last_name}".strip()
    if hasattr(obj, "description"):
        return obj.description[:50]
    return str(obj.id)


def _serialize_item(obj, item_type):
    return {
        "type": item_type,
        "id": str(obj.id),
        "name": _get_name(obj),
        "deleted_at": obj.deleted_at.isoformat() if obj.deleted_at else None,
        "deleted_by_name": (
            obj.deleted_by.get_full_name() or obj.deleted_by.email
            if obj.deleted_by
            else None
        ),
        "deletion_source": obj.deletion_source,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trash_list(request):
    org = request.organization
    type_filter = request.query_params.get("type")

    items = []
    for item_type, Model in MODEL_MAP.items():
        if type_filter and type_filter != item_type:
            continue
        qs = Model.all_objects.filter(
            organization=org,
            deleted_at__isnull=False,
        ).select_related("deleted_by").order_by("-deleted_at")
        for obj in qs:
            items.append(_serialize_item(obj, item_type))

    items.sort(key=lambda x: x["deleted_at"] or "", reverse=True)
    return Response(items)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def trash_restore(request):
    item_type = request.data.get("type")
    ids = request.data.get("ids", [])

    Model = MODEL_MAP.get(item_type)
    if not Model:
        return Response(
            {"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST
        )

    org = request.organization
    restored = 0
    for obj in Model.all_objects.filter(
        organization=org, id__in=ids, deleted_at__isnull=False
    ):
        obj.restore()
        restored += 1

    return Response({"restored": restored})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def trash_permanent_delete(request):
    item_type = request.data.get("type")
    ids = request.data.get("ids", [])

    Model = MODEL_MAP.get(item_type)
    if not Model:
        return Response(
            {"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST
        )

    org = request.organization
    qs = Model.all_objects.filter(
        organization=org, id__in=ids, deleted_at__isnull=False
    )
    count, _ = qs.hard_delete()

    return Response({"deleted": count})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def trash_empty(request):
    org = request.organization
    total = 0
    for Model in [Task, Deal, Contact]:
        qs = Model.all_objects.filter(
            organization=org, deleted_at__isnull=False
        )
        count, _ = qs.hard_delete()
        total += count

    return Response({"deleted": total})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trash_counts(request):
    org = request.organization
    counts = {}
    for item_type, Model in MODEL_MAP.items():
        counts[item_type] = Model.all_objects.filter(
            organization=org, deleted_at__isnull=False
        ).count()
    counts["total"] = sum(counts.values())
    return Response(counts)
