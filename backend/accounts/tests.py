from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_and_org(self):
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
            "organization_name": "Test Workspace",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "hugo@example.com")

    def test_register_duplicate_email_fails(self):
        self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
            "organization_name": "Test Workspace",
        })
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "anotherpass123",
            "first_name": "Hugo",
            "last_name": "Frely",
            "organization_name": "Test Workspace",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
            "organization_name": "Test Workspace",
        })
        response = self.client.post("/api/auth/login/", {
            "email": "hugo@example.com",
            "password": "securepass123",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_login_wrong_password_fails(self):
        self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
            "organization_name": "Test Workspace",
        })
        response = self.client.post("/api/auth/login/", {
            "email": "hugo@example.com",
            "password": "wrongpass",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_returns_user(self):
        reg = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
            "organization_name": "Test Workspace",
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {reg.data['access']}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "hugo@example.com")

    def test_me_endpoint_unauthenticated_fails(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_uses_organization_name(self):
        response = self.client.post("/api/auth/register/", {
            "email": "org@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
            "organization_name": "Acme Corp",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        from organizations.models import Organization, Membership
        org = Organization.objects.get(
            memberships__user__email="org@example.com",
            memberships__role="owner",
        )
        self.assertEqual(org.name, "Acme Corp")

    def test_register_requires_organization_name(self):
        response = self.client.post("/api/auth/register/", {
            "email": "noorg@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization_name", response.data)
