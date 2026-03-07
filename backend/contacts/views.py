from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from .models import Contact, ContactCategory, CustomFieldDefinition
from .serializers import ContactSerializer, ContactCategorySerializer, CustomFieldDefinitionSerializer
from notes.models import TimelineEntry

ALLOWED_ORDERING = {
    "last_name", "-last_name",
    "created_at", "-created_at",
    "lead_score", "-lead_score",
    "company", "-company",
}


class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Contact.objects.filter(organization=self.request.organization)

        # Category filter (existing)
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(categories__id=category_id)

        # Date filters
        created_after = self.request.query_params.get("created_after")
        if created_after:
            qs = qs.filter(created_at__date__gte=created_after)

        created_before = self.request.query_params.get("created_before")
        if created_before:
            qs = qs.filter(created_at__date__lte=created_before)

        # Lead score filter
        lead_score = self.request.query_params.get("lead_score")
        if lead_score:
            qs = qs.filter(lead_score=lead_score)

        # Source filter
        source = self.request.query_params.get("source")
        if source:
            qs = qs.filter(source=source)

        # Tags filter (OR between tags)
        tags_param = self.request.query_params.get("tags")
        if tags_param:
            tag_list = [t.strip() for t in tags_param.split(",") if t.strip()]
            if tag_list:
                tag_q = Q()
                for tag in tag_list:
                    tag_q |= Q(tags__contains=[tag])
                qs = qs.filter(tag_q)

        # Sorting
        ordering = self.request.query_params.get("ordering", "-created_at")
        if ordering not in ALLOWED_ORDERING:
            ordering = "-created_at"
        qs = qs.order_by(ordering)

        return qs.distinct()

    def perform_create(self, serializer):
        from subscriptions.permissions import require_can_create_contact
        require_can_create_contact(self.request.organization)
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def perform_destroy(self, instance):
        instance.soft_delete(user=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        TimelineEntry.objects.create(
            organization=self.request.organization,
            created_by=self.request.user,
            contact=instance,
            entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
            content="Contact modifié",
        )
        from .ai_summary import trigger_summary_generation
        trigger_summary_generation(str(instance.id))


class ContactCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ContactCategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            ContactCategory.objects.filter(organization=self.request.organization)
            .annotate(contact_count=Count("contacts"))
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    def perform_destroy(self, instance):
        if instance.is_default:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Impossible de supprimer une catégorie par défaut.")
        instance.delete()


class CustomFieldDefinitionViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFieldDefinitionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return CustomFieldDefinition.objects.filter(
            organization=self.request.organization
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    def perform_destroy(self, instance):
        field_id = str(instance.id)
        contacts = Contact.objects.filter(organization=self.request.organization)
        for contact in contacts:
            if field_id in contact.custom_fields:
                del contact.custom_fields[field_id]
                contact.save(update_fields=["custom_fields"])
        instance.delete()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_contacts(request):
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response([])
    qs = Contact.objects.filter(organization=request.organization)
    for word in q.split():
        qs = qs.filter(
            Q(first_name__icontains=word)
            | Q(last_name__icontains=word)
            | Q(company__icontains=word)
            | Q(email__icontains=word)
            | Q(city__icontains=word)
            | Q(siret__icontains=word)
        )
    contacts = qs
    return Response(ContactSerializer(contacts, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_categories(request):
    order = request.data.get("order", [])
    for index, category_id in enumerate(order):
        ContactCategory.objects.filter(
            id=category_id,
            organization=request.organization,
        ).update(order=index)
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_custom_fields(request):
    order = request.data.get("order", [])
    for index, field_id in enumerate(order):
        CustomFieldDefinition.objects.filter(
            id=field_id,
            organization=request.organization,
        ).update(order=index)
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_tags(request):
    """Return all distinct tags used across contacts in this organization."""
    contacts = Contact.objects.filter(
        organization=request.organization
    ).exclude(tags=[]).values_list("tags", flat=True)
    all_tags = set()
    for tag_list in contacts:
        if isinstance(tag_list, list):
            all_tags.update(tag_list)
    return Response(sorted(all_tags))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sources(request):
    """Return all distinct source values used across contacts in this organization."""
    sources = (
        Contact.objects.filter(organization=request.organization)
        .exclude(source="")
        .values_list("source", flat=True)
        .distinct()
    )
    return Response(sorted(set(sources)))
