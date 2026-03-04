from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from organizations.models import Membership


class OrganizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.user = User.objects.get(email="hugo@example.com")

    def test_personal_org_created_on_register(self):
        memberships = Membership.objects.filter(user=self.user)
        self.assertEqual(memberships.count(), 1)
        self.assertEqual(memberships.first().role, "owner")

    def test_list_organizations(self):
        response = self.client.get("/api/organizations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_organization(self):
        response = self.client.post("/api/organizations/", {
            "name": "Mon Agence",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Mon Agence")
        membership = Membership.objects.get(
            user=self.user,
            organization_id=response.data["id"],
        )
        self.assertEqual(membership.role, "owner")
