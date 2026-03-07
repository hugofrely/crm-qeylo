from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, Sum, Value, CharField
from django.db.models.functions import Concat

from .models import Company
from .serializers import CompanySerializer, CompanyListSerializer, ContactRelationshipSerializer
from contacts.models import Contact, ContactRelationship
from contacts.serializers import ContactSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return CompanyListSerializer
        return CompanySerializer

    def get_queryset(self):
        qs = Company.objects.filter(organization=self.request.organization)

        if self.action == "list":
            qs = qs.select_related("parent", "owner").annotate(
                contacts_count=Count("contacts", distinct=True),
                deals_count=Count("deals", distinct=True),
                open_deals_value=Sum(
                    "deals__amount",
                    filter=~Q(deals__stage__name__in=["Gagne", "Perdu", "Gagné"]),
                    default=0,
                ),
                won_deals_value=Sum(
                    "deals__amount",
                    filter=Q(deals__stage__name__in=["Gagne", "Gagné"]),
                    default=0,
                ),
                owner_name=Concat(
                    "owner__first_name", Value(" "), "owner__last_name",
                    output_field=CharField(),
                ),
            )

        # Filters
        search = self.request.query_params.get("search")
        if search:
            for word in search.split():
                qs = qs.filter(
                    Q(name__icontains=word) | Q(domain__icontains=word)
                )

        industry = self.request.query_params.get("industry")
        if industry:
            qs = qs.filter(industry__iexact=industry)

        owner = self.request.query_params.get("owner")
        if owner:
            qs = qs.filter(owner_id=owner)

        health = self.request.query_params.get("health_score")
        if health:
            qs = qs.filter(health_score=health)

        parent = self.request.query_params.get("parent")
        if parent:
            qs = qs.filter(parent_id=parent)

        has_open_deals = self.request.query_params.get("has_open_deals")
        if has_open_deals == "true":
            qs = qs.filter(
                deals__isnull=False,
            ).exclude(
                deals__stage__name__in=["Gagne", "Perdu", "Gagné"],
            ).distinct()

        # Ordering
        ordering = self.request.query_params.get("ordering", "-created_at")
        allowed_orderings = [
            "name", "-name", "created_at", "-created_at",
            "annual_revenue", "-annual_revenue",
            "employee_count", "-employee_count",
        ]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        return qs

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def perform_destroy(self, instance):
        instance.soft_delete(user=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_contacts(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    contacts = Contact.objects.filter(company_entity=company)
    return Response(ContactSerializer(contacts, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_deals(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    from deals.models import Deal
    from deals.serializers import DealSerializer
    deals = Deal.objects.filter(company=company).select_related("stage", "contact")
    return Response(DealSerializer(deals, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_subsidiaries(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)

    def _collect(parent, depth=0):
        result = []
        for child in Company.objects.filter(parent=parent):
            data = CompanySerializer(child).data
            data["depth"] = depth
            data["children"] = _collect(child, depth + 1)
            result.append(data)
        return result

    return Response(_collect(company))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_hierarchy(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)

    root = company
    while root.parent:
        root = root.parent

    def _build_tree(node):
        data = CompanySerializer(node).data
        data["children"] = [_build_tree(c) for c in Company.objects.filter(parent=node)]
        return data

    return Response(_build_tree(root))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_stats(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    from deals.models import Deal
    from django.db.models import Avg

    deals = Deal.objects.filter(company=company)
    open_deals = deals.exclude(stage__name__in=["Gagne", "Perdu", "Gagné"])
    won_deals = deals.filter(stage__name__in=["Gagne", "Gagné"])
    lost_deals = deals.filter(stage__name__in=["Perdu"])

    return Response({
        "contacts_count": Contact.objects.filter(company_entity=company).count(),
        "total_deals": deals.count(),
        "open_deals": open_deals.count(),
        "won_deals": won_deals.count(),
        "lost_deals": lost_deals.count(),
        "open_deals_value": str(open_deals.aggregate(t=Sum("amount"))["t"] or 0),
        "won_deals_value": str(won_deals.aggregate(t=Sum("amount"))["t"] or 0),
        "avg_deal_value": str(won_deals.aggregate(a=Avg("amount"))["a"] or 0),
        "subsidiaries_count": company.subsidiaries.count(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_org_chart(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    contacts = Contact.objects.filter(company_entity=company)
    contact_ids = list(contacts.values_list("id", flat=True))

    relationships = ContactRelationship.objects.filter(
        organization=request.organization,
        from_contact_id__in=contact_ids,
        to_contact_id__in=contact_ids,
    )

    nodes = [
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}".strip(),
            "job_title": c.job_title,
            "email": c.email,
            "phone": c.phone,
        }
        for c in contacts
    ]

    edges = [
        {
            "id": str(r.id),
            "from": str(r.from_contact_id),
            "to": str(r.to_contact_id),
            "type": r.relationship_type,
            "label": r.get_relationship_type_display(),
            "notes": r.notes,
        }
        for r in relationships
    ]

    return Response({"nodes": nodes, "edges": edges})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_timeline(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    from notes.models import TimelineEntry
    from notes.serializers import TimelineEntrySerializer
    entries = TimelineEntry.objects.filter(
        contact__company_entity=company,
    ).order_by("-created_at")[:50]
    return Response(TimelineEntrySerializer(entries, many=True).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def contact_relationships(request, pk):
    contact = Contact.objects.get(id=pk, organization=request.organization)

    if request.method == "GET":
        rels = ContactRelationship.objects.filter(
            Q(from_contact=contact) | Q(to_contact=contact),
            organization=request.organization,
        )
        return Response(ContactRelationshipSerializer(rels, many=True).data)

    serializer = ContactRelationshipSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(organization=request.organization)
    return Response(serializer.data, status=201)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_contact_relationship(request, pk):
    rel = ContactRelationship.objects.get(
        id=pk, organization=request.organization,
    )
    rel.delete()
    return Response(status=204)
