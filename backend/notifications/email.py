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
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#FAFAF7;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;padding:40px 0;">
    <tr>
      <td align="center">
        <!-- Pre-header spacer with logo -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td style="padding:0 4px 12px;">
              <span style="font-size:20px;font-weight:400;color:#0D4F4F;letter-spacing:-0.3px;font-family:'Instrument Serif',Georgia,serif;">Qeylo</span>
            </td>
          </tr>
        </table>
        <!-- Main card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E2DC;">
          <!-- Teal top bar -->
          <tr>
            <td style="height:4px;background-color:#0D4F4F;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 32px;">
              {content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #E5E2DC;">
              <span style="font-size:11px;color:#8A8680;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">\u00a9 Qeylo CRM &mdash; Vous recevez cet e-mail car vous avez un compte Qeylo.</span>
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
<h2 style="margin:0 0 6px;font-size:22px;color:#1A1A17;font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:-0.01em;">Vous avez \u00e9t\u00e9 invit\u00e9(e)</h2>
<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#1A1A17;">
  <strong style="color:#0D4F4F;">{org_name}</strong> vous invite \u00e0 rejoindre leur espace de travail sur Qeylo.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr>
    <td style="background-color:#0D4F4F;border-radius:100px;">
      <a href="{invite_link}"
         style="display:inline-block;padding:11px 28px;font-size:14px;font-weight:500;color:#F5F5F0;text-decoration:none;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Accepter l\u2019invitation
      </a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:12px;color:#8A8680;">
  Si vous n\u2019attendiez pas cette invitation, vous pouvez ignorer cet e-mail.
</p>"""
    _send(to, f"Invitation a rejoindre {org_name} sur Qeylo", _base_template(content))


def send_notification_email(to: str, title: str, message: str) -> None:
    """Send a generic notification email."""
    content = f"""\
<h2 style="margin:0 0 6px;font-size:22px;color:#1A1A17;font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:-0.01em;">{title}</h2>
<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#1A1A17;">
  {message}
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr>
    <td style="background-color:#0D4F4F;border-radius:100px;">
      <a href="{settings.FRONTEND_URL}"
         style="display:inline-block;padding:11px 28px;font-size:14px;font-weight:500;color:#F5F5F0;text-decoration:none;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
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
            f'<td style="padding:10px 12px;border-bottom:1px solid #E5E2DC;font-size:13px;color:#1A1A17;">{r.get("title", "")}</td>'
            f'<td style="padding:10px 12px;border-bottom:1px solid #E5E2DC;font-size:13px;color:#8A8680;white-space:nowrap;">{r.get("due", "")}</td>'
            f'</tr>'
        )

    content = f"""\
<h2 style="margin:0 0 6px;font-size:22px;color:#1A1A17;font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:-0.01em;">Vos rappels du jour</h2>
<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#1A1A17;">
  Vous avez <strong style="color:#0D4F4F;">{len(reminders)}</strong> rappel(s) \u00e0 venir.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="border:1px solid #E5E2DC;border-radius:12px;overflow:hidden;margin-bottom:24px;">
  <tr style="background-color:#F0EDE8;">
    <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0D4F4F;text-transform:uppercase;letter-spacing:0.05em;">Rappel</th>
    <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0D4F4F;text-transform:uppercase;letter-spacing:0.05em;">\u00c9ch\u00e9ance</th>
  </tr>
  {rows}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr>
    <td style="background-color:#0D4F4F;border-radius:100px;">
      <a href="{settings.FRONTEND_URL}"
         style="display:inline-block;padding:11px 28px;font-size:14px;font-weight:500;color:#F5F5F0;text-decoration:none;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Voir dans Qeylo
      </a>
    </td>
  </tr>
</table>"""
    _send(to, f"Vous avez {len(reminders)} rappel(s) a venir", _base_template(content))
