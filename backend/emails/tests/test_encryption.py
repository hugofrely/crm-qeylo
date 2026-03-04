from django.test import TestCase, override_settings
from emails.encryption import encrypt_token, decrypt_token

TEST_KEY = "5ry4sEFn3Jv5atf6Zz35zAv_wqGYj8EvPekGyHzPZdE="


@override_settings(EMAIL_ENCRYPTION_KEY=TEST_KEY)
class EncryptionTests(TestCase):
    def test_encrypt_decrypt_roundtrip(self):
        token = "ya29.a0AfH6SMBx..."
        encrypted = encrypt_token(token)
        self.assertNotEqual(encrypted, token)
        self.assertEqual(decrypt_token(encrypted), token)

    def test_encrypt_produces_different_output_each_time(self):
        token = "some-token"
        a = encrypt_token(token)
        b = encrypt_token(token)
        self.assertNotEqual(a, b)  # Fernet uses random IV

    @override_settings(EMAIL_ENCRYPTION_KEY="")
    def test_encrypt_without_key_raises(self):
        with self.assertRaises(ValueError):
            encrypt_token("token")

    @override_settings(EMAIL_ENCRYPTION_KEY="")
    def test_decrypt_without_key_raises(self):
        with self.assertRaises(ValueError):
            decrypt_token("data")
