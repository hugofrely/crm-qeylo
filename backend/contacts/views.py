from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Contact
from .serializers import ContactSerializer


class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Contact.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_contacts(request):
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response([])
    contacts = Contact.objects.filter(
        organization=request.organization
    ).filter(
        Q(first_name__icontains=q)
        | Q(last_name__icontains=q)
        | Q(company__icontains=q)
        | Q(email__icontains=q)
    )
    return Response(ContactSerializer(contacts, many=True).data)
