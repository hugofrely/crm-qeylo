from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from organizations.models import Organization, Membership, Invitation


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


class InvitationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        reg = self.client.post("/api/auth/register/", {
            "email": "owner@example.com",
            "password": "securepass123",
            "first_name": "Owner",
            "last_name": "User",
        })
        self.owner_token = reg.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_token}")
        self.owner = User.objects.get(email="owner@example.com")
        self.org = Organization.objects.filter(memberships__user=self.owner).first()

    def test_invite_member(self):
        response = self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "new@example.com", "role": "member"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "new@example.com")

    def test_list_members(self):
        response = self.client.get(f"/api/organizations/{self.org.id}/members/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["members"]), 1)
        self.assertEqual(response.data["members"][0]["role"], "owner")

    def test_accept_invitation_auto_on_register(self):
        """Registration auto-accepts pending invitations for the same email."""
        self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "new@example.com", "role": "member"},
        )
        invitation = Invitation.objects.get(email="new@example.com")
        # Register with the invited email — should auto-accept
        client2 = APIClient()
        client2.post("/api/auth/register/", {
            "email": "new@example.com",
            "password": "securepass123",
            "first_name": "New",
            "last_name": "User",
        })
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, "accepted")
        user2 = User.objects.get(email="new@example.com")
        self.assertTrue(
            Membership.objects.filter(organization=self.org, user=user2).exists()
        )

    def test_duplicate_invite_rejected(self):
        self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "dup@example.com", "role": "member"},
        )
        response = self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "dup@example.com", "role": "member"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_owner_cannot_invite(self):
        client2 = APIClient()
        reg2 = client2.post("/api/auth/register/", {
            "email": "member@example.com",
            "password": "securepass123",
            "first_name": "Member",
            "last_name": "User",
        })
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {reg2.data['access']}")
        user2 = User.objects.get(email="member@example.com")
        Membership.objects.create(organization=self.org, user=user2, role="member")
        response = client2.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "another@example.com", "role": "member"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
