from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task

MAX_RESULTS = 5


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def global_search(request):
    q = request.query_params.get("q", "").strip()
    if len(q) < 2:
        return Response({"contacts": [], "deals": [], "tasks": []})

    org = request.organization
    words = q.split()

    # --- Contacts ---
    contacts_qs = Contact.objects.filter(organization=org)
    for word in words:
        contacts_qs = contacts_qs.filter(
            Q(first_name__icontains=word)
            | Q(last_name__icontains=word)
            | Q(company__icontains=word)
            | Q(email__icontains=word)
        )
    contacts = [
        {
            "id": str(c.id),
            "first_name": c.first_name,
            "last_name": c.last_name,
            "company": c.company,
            "email": c.email,
        }
        for c in contacts_qs[:MAX_RESULTS]
    ]

    # --- Deals ---
    deals_qs = Deal.objects.filter(organization=org).select_related("stage", "contact")
    for word in words:
        deals_qs = deals_qs.filter(
            Q(name__icontains=word)
            | Q(notes__icontains=word)
            | Q(contact__first_name__icontains=word)
            | Q(contact__last_name__icontains=word)
        )
    deals = [
        {
            "id": str(d.id),
            "name": d.name,
            "amount": str(d.amount),
            "stage_name": d.stage.name if d.stage else "",
            "contact_name": f"{d.contact.first_name} {d.contact.last_name}".strip() if d.contact else "",
        }
        for d in deals_qs[:MAX_RESULTS]
    ]

    # --- Tasks ---
    tasks_qs = Task.objects.filter(organization=org).select_related("contact", "deal")
    for word in words:
        tasks_qs = tasks_qs.filter(
            Q(description__icontains=word)
            | Q(contact__first_name__icontains=word)
            | Q(contact__last_name__icontains=word)
            | Q(deal__name__icontains=word)
        )
    tasks = [
        {
            "id": str(t.id),
            "description": t.description,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "is_done": t.is_done,
            "contact_name": f"{t.contact.first_name} {t.contact.last_name}".strip() if t.contact else "",
        }
        for t in tasks_qs[:MAX_RESULTS]
    ]

    return Response({"contacts": contacts, "deals": deals, "tasks": tasks})
