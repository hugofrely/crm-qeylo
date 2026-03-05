from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ProductTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "test@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "Test Workspace",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_category(self):
        response = self.client.post("/api/products/categories/", {"name": "Services", "order": 1})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Services")

    def test_create_product(self):
        response = self.client.post(
            "/api/products/",
            {"name": "Dev web", "unit_price": "500.00", "unit": "day", "tax_rate": "20.00"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Dev web")
        self.assertEqual(response.data["unit"], "day")

    def test_create_product_with_category(self):
        cat = self.client.post("/api/products/categories/", {"name": "Dev"}).data
        response = self.client.post(
            "/api/products/",
            {"name": "API REST", "unit_price": "600.00", "unit": "day", "category": cat["id"]},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category_name"], "Dev")

    def test_list_products_filter_active(self):
        self.client.post("/api/products/", {"name": "Active", "unit_price": "100"}, format="json")
        p2 = self.client.post("/api/products/", {"name": "Archived", "unit_price": "200"}, format="json").data
        self.client.patch(f"/api/products/{p2['id']}/", {"is_active": False}, format="json")
        active = self.client.get("/api/products/?active=true")
        self.assertEqual(len(active.data["results"]), 1)

    def test_search_products(self):
        self.client.post("/api/products/", {"name": "Design UI", "unit_price": "100", "reference": "DES-001"})
        self.client.post("/api/products/", {"name": "Backend API", "unit_price": "200", "reference": "BKD-001"})
        response = self.client.get("/api/products/?search=design")
        self.assertEqual(len(response.data["results"]), 1)

    def test_update_product(self):
        p = self.client.post("/api/products/", {"name": "Old", "unit_price": "100"}).data
        response = self.client.patch(f"/api/products/{p['id']}/", {"name": "New", "unit_price": "150"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "New")

    def test_delete_product(self):
        p = self.client.post("/api/products/", {"name": "ToDelete", "unit_price": "100"}).data
        response = self.client.delete(f"/api/products/{p['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
