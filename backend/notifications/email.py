import logging

import resend
from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _send(to: str, subject: str, html: str) -> None:
    """Send an email via Resend.  No-op when the API key is not configured."""
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if not api_key:
        logger.debug("RESEND_API_KEY not set -- skipping email to %s", to)
        return

    resend.api_key = api_key
    try:
        resend.Emails.send(
            {
                "from": settings.EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
    except Exception:
        logger.exception("Failed to send email to %s", to)


def _base_template(content: str) -> str:
    """Wrap *content* in the branded Qeylo HTML email layout."""
    return f"""\
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#F97316;padding:24px 32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Qeylo</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              {content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <span style="font-size:12px;color:#a1a1aa;">&copy; Qeylo CRM &mdash; Vous recevez cet e-mail car vous avez un compte Qeylo.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Public email senders
# ---------------------------------------------------------------------------

def send_invitation_email(to: str, org_name: str, invite_link: str) -> None:
    """Send an organisation invitation email."""
    content = f"""\
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Vous avez ete invite(e) !</h2>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
  <strong>{org_name}</strong> vous invite a rejoindre leur espace de travail sur Qeylo.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr>
    <td style="background-color:#F97316;border-radius:8px;">
      <a href="{invite_link}"
         style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        Accepter l'invitation
      </a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#a1a1aa;">
  Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.
</p>"""
    _send(to, f"Invitation a rejoindre {org_name} sur Qeylo", _base_template(content))


def send_notification_email(to: str, title: str, message: str) -> None:
    """Send a generic notification email."""
    content = f"""\
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">{title}</h2>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
  {message}
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr>
    <td style="background-color:#F97316;border-radius:8px;">
      <a href="{settings.FRONTEND_URL}"
         style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        Ouvrir Qeylo
      </a>
    </td>
  </tr>
</table>"""
    _send(to, title, _base_template(content))


def send_reminder_email(to: str, reminders: list[dict]) -> None:
    """Send a digest of upcoming reminders.

    Each dict in *reminders* should have at least ``title`` and ``due`` keys.
    """
    rows = ""
    for r in reminders:
        rows += (
            f'<tr>'
            f'<td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b;">{r.get("title", "")}</td>'
            f'<td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#71717a;white-space:nowrap;">{r.get("due", "")}</td>'
            f'</tr>'
        )

    content = f"""\
<h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Vos rappels du jour</h2>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">
  Vous avez <strong>{len(reminders)}</strong> rappel(s) a venir.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;margin-bottom:24px;">
  <tr style="background-color:#f4f4f5;">
    <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#3f3f46;">Rappel</th>
    <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#3f3f46;">Echeance</th>
  </tr>
  {rows}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr>
    <td style="background-color:#F97316;border-radius:8px;">
      <a href="{settings.FRONTEND_URL}"
         style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        Voir dans Qeylo
      </a>
    </td>
  </tr>
</table>"""
    _send(to, f"Vous avez {len(reminders)} rappel(s) a venir", _base_template(content))
