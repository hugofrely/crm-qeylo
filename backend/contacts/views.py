from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from .models import Contact, ContactCategory, CustomFieldDefinition
from .serializers import ContactSerializer, ContactCategorySerializer, CustomFieldDefinitionSerializer
from notes.models import TimelineEntry


class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Contact.objects.filter(organization=self.request.organization)
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(categories__id=category_id)
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

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
