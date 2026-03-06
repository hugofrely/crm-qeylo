from django.test import TestCase
from emails.template_rendering import render_email_template


class RenderEmailTemplateTests(TestCase):
    def test_replaces_contact_variables(self):
        context = {
            "contact": {
                "first_name": "Jean",
                "last_name": "Dupont",
                "email": "jean@example.com",
                "company": "Acme",
                "phone": "0612345678",
            }
        }
        subject = "Bonjour {{contact.first_name}}"
        body = "<p>Cher {{contact.first_name}} {{contact.last_name}} de {{contact.company}}</p>"

        rendered_subject, rendered_body = render_email_template(subject, body, context)

        self.assertEqual(rendered_subject, "Bonjour Jean")
        self.assertEqual(rendered_body, "<p>Cher Jean Dupont de Acme</p>")

    def test_replaces_deal_variables(self):
        context = {
            "contact": {"first_name": "Jean", "last_name": "Dupont", "email": "", "company": "", "phone": ""},
            "deal": {"name": "Projet Web", "amount": "5000", "stage": "Negotiation"},
        }
        body = "<p>Deal: {{deal.name}} — {{deal.amount}}€</p>"

        _, rendered_body = render_email_template("", body, context)

        self.assertEqual(rendered_body, "<p>Deal: Projet Web — 5000€</p>")

    def test_missing_variable_replaced_by_empty_string(self):
        context = {"contact": {"first_name": "Jean", "last_name": "", "email": "", "company": "", "phone": ""}}
        body = "<p>{{contact.first_name}} — {{deal.name}}</p>"

        _, rendered_body = render_email_template("", body, context)

        self.assertEqual(rendered_body, "<p>Jean — </p>")

    def test_no_variables_returns_unchanged(self):
        body = "<p>Simple text</p>"
        _, rendered_body = render_email_template("Subject", body, {})
        self.assertEqual(rendered_body, "<p>Simple text</p>")
