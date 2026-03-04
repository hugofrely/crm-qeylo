# Emails intégrés — Envoi depuis le CRM (MVP)

**Date :** 2026-03-04
**Status :** Approuvé
**Scope :** Envoi d'emails via Gmail et Outlook (OAuth), depuis la fiche contact et via le chat IA

---

## Résumé

Permettre aux utilisateurs d'envoyer des emails directement depuis le CRM en connectant leur compte Gmail ou Outlook via OAuth. Les emails envoyés sont loggués dans la timeline du contact. L'IA peut aussi rédiger et envoyer des emails via le chat.

**Ce qu'on ne fait PAS dans le MVP :** lecture d'emails, sync inbox, pièces jointes, templates, suivi d'ouverture, rich text editor, envoi différé.

---

## 1. Architecture — Approche retenue

**OAuth côté backend.** Le flux OAuth complet est géré par Django. Le frontend redirige vers les endpoints backend, Django gère le dance OAuth, stocke les tokens chiffrés en DB, et expose un endpoint d'envoi. L'IA peut envoyer des emails directement depuis le backend sans passer par le frontend.

---

## 2. Modèle de données

### `EmailAccount` — Compte email connecté

```python
class EmailAccount(models.Model):
    PROVIDER_GMAIL = 'gmail'
    PROVIDER_OUTLOOK = 'outlook'
    PROVIDER_CHOICES = [
        (PROVIDER_GMAIL, 'Gmail'),
        (PROVIDER_OUTLOOK, 'Outlook'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_accounts')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    provider = models.CharField(max_length=10, choices=PROVIDER_CHOICES)
    email_address = models.EmailField()
    access_token = models.TextField()      # chiffré Fernet
    refresh_token = models.TextField()     # chiffré Fernet
    token_expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'organization', 'provider')
```

### `SentEmail` — Log des emails envoyés

```python
class SentEmail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    email_account = models.ForeignKey(EmailAccount, on_delete=models.SET_NULL, null=True)
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True)
    to_email = models.EmailField()
    subject = models.CharField(max_length=500)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    provider_message_id = models.CharField(max_length=255, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
```

### Chiffrement des tokens

Algorithme Fernet (AES-128-CBC + HMAC-SHA256) via `cryptography`. Clé `EMAIL_ENCRYPTION_KEY` dans `.env`, générée via `Fernet.generate_key()`. Tokens chiffrés avant `save()`, déchiffrés uniquement dans le service d'envoi.

---

## 3. Flux OAuth

### Google Gmail

1. Frontend redirige vers `GET /api/email/connect/gmail/`
2. Backend construit l'URL Google OAuth :
   - `scope: https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email`
   - `access_type: offline`, `prompt: consent`
   - `redirect_uri: {BACKEND_URL}/api/email/callback/gmail/`
   - `state: JWT signé (user_id + org_id, expire 10min)`
3. Callback `GET /api/email/callback/gmail/` : échange code → tokens, récupère email via userinfo, crée/met à jour `EmailAccount`, redirige vers `{FRONTEND_URL}/settings?email_connected=true`

### Microsoft Outlook

1. Frontend redirige vers `GET /api/email/connect/outlook/`
2. Backend construit l'URL Microsoft OAuth :
   - `scope: https://graph.microsoft.com/Mail.Send User.Read offline_access`
   - `redirect_uri: {BACKEND_URL}/api/email/callback/outlook/`
   - `state: JWT signé`
3. Callback : même logique, tokens via Microsoft Identity, email via Graph API `/me`

### Refresh automatique

```python
def get_valid_token(email_account: EmailAccount) -> str:
    if email_account.token_expires_at <= now() + timedelta(minutes=5):
        new_tokens = refresh_oauth_token(email_account)
        email_account.access_token = encrypt(new_tokens['access_token'])
        email_account.token_expires_at = now() + timedelta(seconds=new_tokens['expires_in'])
        if 'refresh_token' in new_tokens:
            email_account.refresh_token = encrypt(new_tokens['refresh_token'])
        email_account.save()
    return decrypt(email_account.access_token)
```

### Variables d'environnement

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
EMAIL_ENCRYPTION_KEY=
```

---

## 4. API d'envoi

### `POST /api/email/send/`

```json
// Request
{
    "contact_id": "uuid",
    "to_email": "jean@example.com",
    "subject": "Relance devis",
    "body_html": "<p>Bonjour Jean...</p>",
    "provider": "gmail"
}

// Response 200
{
    "id": "uuid",
    "provider_message_id": "...",
    "sent_at": "2026-03-04T..."
}
```

**Logique :**

1. Résolution du compte : `provider` spécifié → ce compte. Un seul compte → auto. Plusieurs sans provider → 400.
2. Résolution destinataire : `contact_id` → email du contact. `to_email` prioritaire si fourni.
3. Refresh token si expiré.
4. Envoi via API provider :
   - Gmail : `POST gmail.googleapis.com/gmail/v1/users/me/messages/send` (base64 RFC 2822)
   - Outlook : `POST graph.microsoft.com/v1.0/me/sendMail` (JSON Graph)
5. Crée `SentEmail` en DB.
6. Crée `TimelineEntry` type `email_sent` sur le contact (si lié).

### `GET /api/email/accounts/`

Liste les comptes email connectés de l'utilisateur.

### `DELETE /api/email/accounts/{id}/`

Déconnecte un compte (supprime tokens, `is_active=False`).

### Gestion d'erreurs

| Erreur | Code | Message |
|--------|------|---------|
| Token expiré + refresh échoue | 401 | "Reconnectez votre compte email" (marque `is_active=False`) |
| API provider down | 502 | "Impossible d'envoyer, réessayez" |
| Contact sans email | 400 | "Ce contact n'a pas d'adresse email" |
| Aucun compte connecté | 403 | "Connectez un compte email dans les paramètres" |

---

## 5. Intégration Chat IA

### Tool `send_email`

```python
@agent.tool
async def send_email(
    ctx: RunContext[ChatContext],
    contact_id: str,
    subject: str,
    body: str,
) -> str:
```

**Comportement :**

1. Utilisateur : "Envoie un email de relance à Jean Dupont"
2. L'IA recherche le contact, rédige sujet + corps, appelle `send_email`
3. Le tool vérifie `EmailAccount` actif, vérifie email du contact, convertit body en HTML, envoie, crée `SentEmail` + `TimelineEntry`
4. Retourne `{"action": "email_sent", "to": "jean@example.com", "subject": "..."}`

### Prompt système

```
{% if has_email_account %}
L'utilisateur a un compte email connecté ({{ email_provider }}).
Tu peux envoyer des emails aux contacts en utilisant l'outil send_email.
Rédige des emails professionnels et concis en français.
{% else %}
L'utilisateur n'a pas de compte email connecté. S'il demande d'envoyer un email,
suggère-lui de connecter son compte dans Paramètres > Comptes email.
{% endif %}
```

---

## 6. Frontend — UX

### Settings — Comptes email connectés

Nouvelle section dans `/settings` entre le toggle notifications et les liens pipeline/organisation :

- Liste des comptes connectés (provider, email, indicateur actif/inactif, bouton déconnexion)
- Boutons "Connecter Gmail" / "Connecter Outlook" → redirection vers `/api/email/connect/{provider}/`
- Retour `?email_connected=true` → toast succès
- Indicateur rouge si `is_active=false` (token expiré)

### Fiche contact — Bouton email

Bouton "Email" à côté du nom du contact (visible si contact a un email ET user a un compte connecté). Ouvre un dialog compositeur :

- Select "De" (si plusieurs comptes, caché si un seul)
- "À" pré-rempli avec l'email du contact
- Champ "Objet"
- Textarea "Corps" (texte simple, pas de rich text MVP)
- Boutons Annuler / Envoyer
- Envoi → `POST /api/email/send/` → toast → email dans timeline

### InlineToolCard `send_email`

Dans le chat : `✉️ Email envoyé — À : jean@example.com — Objet : Relance devis`
États : ⏳ Envoi en cours → ✉️ Email envoyé → ❌ Erreur d'envoi

---

## 7. Sécurité

| Aspect | Implémentation |
|--------|----------------|
| Token storage | Chiffré Fernet en DB, jamais exposé en API/logs |
| Scopes OAuth | Minimaux : `gmail.send` + `userinfo.email` / `Mail.Send` + `User.Read` |
| State CSRF | JWT signé avec expiration 10min |
| Rate limiting | Limites natives Gmail (100/jour) et Outlook (300/min) |
| Validation | `to_email` validé par DRF EmailField |
| Un compte/provider | `unique_together` sur `(user, org, provider)` |
