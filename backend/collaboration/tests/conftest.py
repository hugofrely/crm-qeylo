import pytest
from rest_framework_simplejwt.tokens import AccessToken
from accounts.models import User
from organizations.models import Organization, Membership


@pytest.fixture
def user_with_org(db):
    """Create a user with an organization and return (user, org, token_str)."""
    user = User.objects.create_user(email="ws@test.com", password="testpass123")
    org = Organization.objects.create(name="Test Org")
    Membership.objects.create(user=user, organization=org, role="member")
    token = AccessToken.for_user(user)
    return user, org, str(token)
