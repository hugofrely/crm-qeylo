from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ContactTests(TestCase):
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

    def test_create_contact(self):
        response = self.client.post(
            "/api/contacts/",
            {
                "first_name": "Marie",
                "last_name": "Dupont",
                "company": "Decathlon",
                "email": "marie@decathlon.com",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["first_name"], "Marie")

    def test_list_contacts(self):
        self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        self.client.post(
            "/api/contacts/", {"first_name": "Pierre", "last_name": "Martin"}
        )
        response = self.client.get("/api/contacts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_update_contact(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.patch(
            f"/api/contacts/{create.data['id']}/", {"company": "Nike"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company"], "Nike")

    def test_delete_contact(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.delete(f"/api/contacts/{create.data['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_search_contacts(self):
        self.client.post(
            "/api/contacts/",
            {
                "first_name": "Marie",
                "last_name": "Dupont",
                "company": "Decathlon",
            },
        )
        self.client.post(
            "/api/contacts/",
            {
                "first_name": "Pierre",
                "last_name": "Martin",
                "company": "Nike",
            },
        )
        response = self.client.get("/api/contacts/search/?q=decathlon")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_contacts_scoped_to_organization(self):
        self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        client2 = APIClient()
        reg2 = client2.post(
            "/api/auth/register/",
            {
                "email": "other@example.com",
                "password": "securepass123",
                "first_name": "Other",
                "last_name": "User",
            },
        )
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {reg2.data['access']}")
        response = client2.get("/api/contacts/")
        self.assertEqual(response.data["count"], 0)
