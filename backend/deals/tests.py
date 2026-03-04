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
