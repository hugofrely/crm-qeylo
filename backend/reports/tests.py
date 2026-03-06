from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ReportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "test@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_report(self):
        response = self.client.post(
            "/api/reports/",
            {
                "name": "Mon rapport",
                "description": "Test",
                "widgets": [
                    {
                        "id": "w1",
                        "type": "bar_chart",
                        "title": "Deals par stage",
                        "source": "deals",
                        "metric": "count",
                        "group_by": "stage",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Mon rapport")
        self.assertEqual(len(response.data["widgets"]), 1)

    def test_list_reports(self):
        self.client.post("/api/reports/", {"name": "Report 1", "widgets": []}, format="json")
        self.client.post("/api/reports/", {"name": "Report 2", "widgets": []}, format="json")
        response = self.client.get("/api/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_update_report(self):
        create = self.client.post("/api/reports/", {"name": "Original", "widgets": []}, format="json")
        response = self.client.patch(f"/api/reports/{create.data['id']}/", {"name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated")

    def test_delete_report(self):
        create = self.client.post("/api/reports/", {"name": "To delete", "widgets": []}, format="json")
        response = self.client.delete(f"/api/reports/{create.data['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_delete_template(self):
        from reports.models import Report
        from organizations.models import Membership
        membership = Membership.objects.get(user__email="test@example.com")
        report = Report.objects.create(
            organization=membership.organization,
            created_by=membership.user,
            name="Template",
            is_template=True,
            widgets=[],
        )
        response = self.client.delete(f"/api/reports/{report.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_aggregate_deals_by_stage(self):
        from deals.models import PipelineStage
        from organizations.models import Membership
        membership = Membership.objects.get(user__email="test@example.com")
        org = membership.organization
        stage = PipelineStage.objects.filter(pipeline__organization=org).first()
        self.client.post("/api/deals/", {"name": "Deal 1", "amount": "5000", "stage": str(stage.id)}, format="json")
        self.client.post("/api/deals/", {"name": "Deal 2", "amount": "3000", "stage": str(stage.id)}, format="json")
        response = self.client.post("/api/reports/aggregate/", {"source": "deals", "metric": "count", "group_by": "stage"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        self.assertEqual(response.data["total"], 2)

    def test_aggregate_deals_sum_amount(self):
        from deals.models import PipelineStage
        from organizations.models import Membership
        membership = Membership.objects.get(user__email="test@example.com")
        stage = PipelineStage.objects.filter(pipeline__organization=membership.organization).first()
        self.client.post("/api/deals/", {"name": "Deal A", "amount": "5000", "stage": str(stage.id)}, format="json")
        self.client.post("/api/deals/", {"name": "Deal B", "amount": "3000", "stage": str(stage.id)}, format="json")
        response = self.client.post("/api/reports/aggregate/", {"source": "deals", "metric": "sum:amount", "group_by": "stage"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 8000)

    def test_aggregate_tasks_by_priority(self):
        self.client.post("/api/tasks/", {"description": "Task high", "due_date": "2026-03-10T10:00:00Z", "priority": "high"})
        self.client.post("/api/tasks/", {"description": "Task low", "due_date": "2026-03-10T10:00:00Z", "priority": "low"})
        response = self.client.post("/api/reports/aggregate/", {"source": "tasks", "metric": "count", "group_by": "priority"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)

    def test_aggregate_contacts_by_source(self):
        self.client.post("/api/contacts/", {"first_name": "Alice", "last_name": "A", "source": "website"}, format="json")
        self.client.post("/api/contacts/", {"first_name": "Bob", "last_name": "B", "source": "referral"}, format="json")
        response = self.client.post("/api/reports/aggregate/", {"source": "contacts", "metric": "count", "group_by": "source"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)

    def test_aggregate_unknown_source(self):
        response = self.client.post("/api/reports/aggregate/", {"source": "unknown", "metric": "count", "group_by": "month"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aggregate_unknown_metric(self):
        response = self.client.post("/api/reports/aggregate/", {"source": "deals", "metric": "sum:nonexistent", "group_by": "month"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aggregate_missing_params(self):
        response = self.client.post("/api/reports/aggregate/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
