from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from reports.models import Report
from reports.serializers import ReportSerializer


DEFAULT_DASHBOARD_WIDGETS = [
    {
        "id": "default-contacts-today",
        "type": "kpi_card",
        "title": "Contacts aujourd'hui",
        "source": "contacts",
        "metric": "count",
        "group_by": None,
        "filters": {"date_range": "today"},
        "size": "small",
    },
    {
        "id": "default-revenue-month",
        "type": "kpi_card",
        "title": "Revenu ce mois",
        "source": "deals",
        "metric": "sum:amount",
        "group_by": None,
        "filters": {
            "date_range": "this_month",
            "date_field": "closed_at",
            "stage__name__in": ["Gagné"],
        },
        "size": "small",
    },
    {
        "id": "default-pipeline-active",
        "type": "kpi_card",
        "title": "Pipeline actif",
        "source": "deals",
        "metric": "sum:amount",
        "group_by": None,
        "filters": {},
        "size": "small",
    },
    {
        "id": "default-tasks-today",
        "type": "kpi_card",
        "title": "Taches du jour",
        "source": "tasks",
        "metric": "count",
        "group_by": None,
        "filters": {
            "date_range": "today",
            "date_field": "due_date",
            "is_done": False,
        },
        "size": "small",
    },
    {
        "id": "default-revenue-monthly-chart",
        "type": "line_chart",
        "title": "CA mensuel",
        "source": "deals",
        "metric": "sum:amount",
        "group_by": "month",
        "filters": {
            "date_range": "last_6_months",
            "date_field": "closed_at",
            "stage__name__in": ["Gagné"],
        },
        "size": "medium",
    },
    {
        "id": "default-new-contacts-chart",
        "type": "bar_chart",
        "title": "Nouveaux contacts",
        "source": "contacts",
        "metric": "count",
        "group_by": "week",
        "filters": {"date_range": "last_3_months"},
        "size": "medium",
    },
    {
        "id": "default-deals-won-month",
        "type": "bar_chart",
        "title": "Deals gagnes / mois",
        "source": "deals",
        "metric": "count",
        "group_by": "month",
        "filters": {
            "date_range": "last_6_months",
            "date_field": "closed_at",
            "stage__name__in": ["Gagné"],
        },
        "size": "small",
    },
    {
        "id": "default-deals-by-stage",
        "type": "bar_chart",
        "title": "Deals par etape",
        "source": "deals",
        "metric": "count",
        "group_by": "stage",
        "filters": {},
        "size": "large",
    },
]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    org = request.organization
    user = request.user

    dashboard = Report.objects.filter(
        organization=org, user=user, is_dashboard=True
    ).first()

    if not dashboard:
        dashboard = Report.objects.create(
            organization=org,
            created_by=user,
            user=user,
            name="Mon tableau de bord",
            is_dashboard=True,
            widgets=DEFAULT_DASHBOARD_WIDGETS,
        )

    return Response(ReportSerializer(dashboard).data)
