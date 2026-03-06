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

    def test_aggregate_with_today_date_range(self):
        self.client.post(
            "/api/contacts/",
            {"first_name": "Today", "last_name": "Contact"},
            format="json",
        )
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "contacts", "metric": "count", "date_range": "today"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["total"], 1)

    def test_aggregate_with_this_week_date_range(self):
        self.client.post(
            "/api/contacts/",
            {"first_name": "Week", "last_name": "Contact"},
            format="json",
        )
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "contacts", "metric": "count", "date_range": "this_week"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["total"], 1)

    def test_aggregate_with_compare(self):
        self.client.post(
            "/api/contacts/",
            {"first_name": "Compare", "last_name": "Contact"},
            format="json",
        )
        response = self.client.post(
            "/api/reports/aggregate/",
            {
                "source": "contacts",
                "metric": "count",
                "date_range": "this_month",
                "compare": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("previous_total", response.data)
        self.assertIn("delta_percent", response.data)

    def test_aggregate_without_compare_has_no_delta(self):
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "contacts", "metric": "count", "date_range": "this_month"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("previous_total", response.data)

    def test_dashboard_auto_creates(self):
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_dashboard"])
        self.assertEqual(len(response.data["widgets"]), 8)

    def test_dashboard_returns_same_on_second_call(self):
        response1 = self.client.get("/api/dashboard/")
        response2 = self.client.get("/api/dashboard/")
        self.assertEqual(response1.data["id"], response2.data["id"])


class FunnelTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "funnel@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "Funnel Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        from organizations.models import Membership
        from deals.models import Pipeline, PipelineStage
        self.membership = Membership.objects.get(user__email="funnel@example.com")
        self.org = self.membership.organization
        self.pipeline = Pipeline.objects.filter(organization=self.org).first()
        self.stages = list(self.pipeline.stages.order_by("order"))

    def _create_deal_and_advance(self, name, amount, stages_to_visit):
        """Create a deal and move it through the given stages in order."""
        response = self.client.post(
            "/api/deals/",
            {"name": name, "amount": str(amount), "stage": str(stages_to_visit[0].id)},
            format="json",
        )
        deal_id = response.data["id"]
        for stage in stages_to_visit[1:]:
            self.client.patch(
                f"/api/deals/{deal_id}/",
                {"stage": str(stage.id)},
                format="json",
            )
        return deal_id

    def test_funnel_basic(self):
        # 3 deals enter stage 0, 2 advance to stage 1, 1 advances to stage 2
        self._create_deal_and_advance("D1", 1000, self.stages[:3])
        self._create_deal_and_advance("D2", 2000, self.stages[:2])
        self._create_deal_and_advance("D3", 3000, [self.stages[0]])

        response = self.client.post(
            "/api/reports/funnel/",
            {"pipeline_id": str(self.pipeline.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data["pipeline"], self.pipeline.name)
        self.assertIn("stages", data)
        self.assertEqual(data["stages"][0]["entered"], 3)
        self.assertEqual(data["stages"][1]["entered"], 2)
        self.assertEqual(data["stages"][2]["entered"], 1)

    def test_funnel_requires_pipeline_id(self):
        response = self.client.post(
            "/api/reports/funnel/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_funnel_cohort_filter(self):
        self._create_deal_and_advance("D1", 1000, self.stages[:2])
        response = self.client.post(
            "/api/reports/funnel/",
            {
                "pipeline_id": str(self.pipeline.id),
                "filter_mode": "cohort",
                "date_range": "this_month",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["stages"][0]["entered"], 1)

    def test_funnel_activity_filter(self):
        self._create_deal_and_advance("D1", 1000, self.stages[:2])
        response = self.client.post(
            "/api/reports/funnel/",
            {
                "pipeline_id": str(self.pipeline.id),
                "filter_mode": "activity",
                "date_range": "this_month",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["stages"][0]["entered"], 1)
