from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class DealTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "hugo@example.com",
                "password": "securepass123",
                "first_name": "Hugo",
                "last_name": "Frely",
                "organization_name": "TestCorp",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_default_pipeline_stages_created(self):
        response = self.client.get("/api/pipeline-stages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 6)

    def test_create_deal(self):
        stages = self.client.get("/api/pipeline-stages/").data
        response = self.client.post(
            "/api/deals/",
            {
                "name": "Site e-commerce",
                "amount": "15000.00",
                "stage": stages[0]["id"],
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_pipeline_view(self):
        stages = self.client.get("/api/pipeline-stages/").data
        self.client.post(
            "/api/deals/",
            {
                "name": "Deal 1",
                "amount": "5000.00",
                "stage": stages[0]["id"],
            },
        )
        response = self.client.get("/api/deals/pipeline/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)

    def test_move_deal(self):
        stages = self.client.get("/api/pipeline-stages/").data
        create = self.client.post(
            "/api/deals/",
            {
                "name": "Deal 1",
                "amount": "5000.00",
                "stage": stages[0]["id"],
            },
        )
        response = self.client.patch(
            f"/api/deals/{create.data['id']}/",
            {"stage": stages[1]["id"]},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["stage"]), stages[1]["id"])


class QuoteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "quoteuser@example.com",
                "password": "securepass123",
                "first_name": "Quote",
                "last_name": "User",
                "organization_name": "QuoteCorp",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        stages = self.client.get("/api/pipeline-stages/").data
        self.deal = self.client.post(
            "/api/deals/",
            {"name": "Test Deal", "amount": "0", "stage": stages[0]["id"]},
        ).data
        self.product = self.client.post(
            "/api/products/",
            {"name": "Dev Web", "unit_price": "500.00", "unit": "day", "tax_rate": "20.00"},
            format="json",
        ).data

    def test_create_quote_with_lines(self):
        response = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "notes": "Valable 30 jours",
                "lines": [
                    {"product": self.product["id"], "description": "Dev Web", "quantity": "5", "unit_price": "500.00", "unit": "day", "tax_rate": "20.00"},
                    {"description": "Frais de déplacement", "quantity": "1", "unit_price": "150.00", "unit": "fixed", "tax_rate": "20.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["lines"]), 2)
        self.assertTrue(response.data["number"].startswith("DEV-"))
        # 5*500 + 1*150 = 2650 HT
        self.assertEqual(response.data["total_ht"], "2650.00")

    def test_create_quote_empty(self):
        response = self.client.post("/api/quotes/", {"deal": self.deal["id"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_ttc"], "0.00")

    def test_update_quote_lines(self):
        quote = self.client.post(
            "/api/quotes/",
            {"deal": self.deal["id"], "lines": [{"description": "Line 1", "quantity": "1", "unit_price": "100.00"}]},
            format="json",
        ).data
        response = self.client.patch(
            f"/api/quotes/{quote['id']}/",
            {"lines": [
                {"description": "Line A", "quantity": "2", "unit_price": "200.00"},
                {"description": "Line B", "quantity": "3", "unit_price": "300.00"},
            ]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["lines"]), 2)

    def test_duplicate_quote(self):
        quote = self.client.post(
            "/api/quotes/",
            {"deal": self.deal["id"], "lines": [{"description": "Service", "quantity": "1", "unit_price": "1000.00"}]},
            format="json",
        ).data
        response = self.client.post(f"/api/quotes/{quote['id']}/duplicate/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response.data["id"], quote["id"])
        self.assertEqual(response.data["status"], "draft")
        self.assertEqual(len(response.data["lines"]), 1)

    def test_accept_quote_updates_deal_amount(self):
        quote = self.client.post(
            "/api/quotes/",
            {"deal": self.deal["id"], "lines": [
                {"description": "Service", "quantity": "10", "unit_price": "100.00", "tax_rate": "20.00"},
            ]},
            format="json",
        ).data
        # total_ttc = 10*100 * 1.20 = 1200
        self.client.post(f"/api/quotes/{quote['id']}/accept/")
        deal = self.client.get(f"/api/deals/{self.deal['id']}/").data
        self.assertEqual(deal["amount"], "1200.00")

    def test_quote_with_line_discount(self):
        response = self.client.post(
            "/api/quotes/",
            {"deal": self.deal["id"], "lines": [
                {"description": "Service", "quantity": "10", "unit_price": "100.00", "tax_rate": "20.00", "discount_percent": "10.00"},
            ]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # 10*100=1000, discount 10% = 100, HT=900
        self.assertEqual(response.data["total_ht"], "900.00")

    def test_quote_with_global_discount(self):
        response = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "global_discount_percent": "5.00",
                "lines": [{"description": "A", "quantity": "1", "unit_price": "1000.00", "tax_rate": "0"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # HT=1000, global 5%=50, total_ht=950
        self.assertEqual(response.data["total_ht"], "950.00")

    def test_list_quotes_for_deal(self):
        self.client.post("/api/quotes/", {"deal": self.deal["id"]}, format="json")
        self.client.post("/api/quotes/", {"deal": self.deal["id"]}, format="json")
        response = self.client.get(f"/api/quotes/?deal={self.deal['id']}")
        self.assertEqual(len(response.data), 2)

    def test_delete_quote(self):
        quote = self.client.post("/api/quotes/", {"deal": self.deal["id"]}, format="json").data
        response = self.client.delete(f"/api/quotes/{quote['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class DealStageTransitionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "transition@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        from organizations.models import Membership
        self.membership = Membership.objects.get(user__email="transition@example.com")
        self.org = self.membership.organization
        from deals.models import PipelineStage
        self.stages = list(
            PipelineStage.objects.filter(pipeline__organization=self.org).order_by("order")
        )

    def test_create_deal_creates_initial_transition(self):
        from deals.models import DealStageTransition
        response = self.client.post(
            "/api/deals/",
            {"name": "Deal 1", "amount": "1000", "stage": str(self.stages[0].id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        deal_id = response.data["id"]
        transitions = DealStageTransition.objects.filter(deal_id=deal_id)
        self.assertEqual(transitions.count(), 1)
        t = transitions.first()
        self.assertIsNone(t.from_stage)
        self.assertEqual(t.to_stage, self.stages[0])
        self.assertIsNone(t.duration_in_previous)

    def test_update_stage_creates_transition(self):
        from deals.models import DealStageTransition
        response = self.client.post(
            "/api/deals/",
            {"name": "Deal 2", "amount": "2000", "stage": str(self.stages[0].id)},
            format="json",
        )
        deal_id = response.data["id"]
        self.client.patch(
            f"/api/deals/{deal_id}/",
            {"stage": str(self.stages[1].id)},
            format="json",
        )
        transitions = DealStageTransition.objects.filter(deal_id=deal_id).order_by("transitioned_at")
        self.assertEqual(transitions.count(), 2)
        second = transitions.last()
        self.assertEqual(second.from_stage, self.stages[0])
        self.assertEqual(second.to_stage, self.stages[1])
        self.assertIsNotNone(second.duration_in_previous)

    def test_update_without_stage_change_no_new_transition(self):
        from deals.models import DealStageTransition
        response = self.client.post(
            "/api/deals/",
            {"name": "Deal 3", "amount": "3000", "stage": str(self.stages[0].id)},
            format="json",
        )
        deal_id = response.data["id"]
        self.client.patch(
            f"/api/deals/{deal_id}/",
            {"name": "Deal 3 renamed"},
            format="json",
        )
        transitions = DealStageTransition.objects.filter(deal_id=deal_id)
        self.assertEqual(transitions.count(), 1)
