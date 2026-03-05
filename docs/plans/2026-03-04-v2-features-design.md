# Qeylo CRM V2 — Design Document

**Date:** 2026-03-04
**Status:** Approved
**Base:** V1 MVP complet (auth, contacts, deals, tasks, dashboard, chat IA, landing page)

---

## Scope V2

5 features, implémentées séquentiellement :

1. Notifications in-app
2. Email via Resend
3. Invitation de membres
4. Rappels automatiques (règles)
5. Import CSV contacts

---

## 1. Notifications In-App

### Modèle

Nouvelle app Django `notifications/`.

**Notification :**
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization | FK Organization | |
| recipient | FK User | |
| type | varchar(50) | reminder, invitation, deal_update, task_due, import_complete |
| title | varchar(255) | |
| message | text | |
| link | varchar(500) | nullable, URL interne pour navigation |
| is_read | bool | default false |
| created_at | datetime | auto |

### API

```
GET    /api/notifications/             → Liste paginée, non-lues d'abord
POST   /api/notifications/read/        → Marquer comme lu (body: {ids: [...]})
POST   /api/notifications/read-all/    → Tout marquer comme lu
GET    /api/notifications/unread-count/ → Compteur pour le badge
```

### Frontend

- Icône cloche dans le header du Sidebar avec badge rouge (non-lues)
- Dropdown au clic : liste notifications (titre, message, timestamp, point bleu non-lu)
- Clic sur notification → navigue vers `link` + marque comme lu

---

## 2. Email via Resend

### Dépendance

- Package Python : `resend`
- Config `.env` : `RESEND_API_KEY`, `EMAIL_FROM=noreply@qeylo.com`

### Service

Fichier `backend/notifications/email.py` :

- `send_invitation_email(to, org_name, invite_link)` — Template invitation
- `send_notification_email(to, title, message)` — Template notification générique
- `send_reminder_email(to, reminders: list)` — Digest de rappels

Templates HTML inline CSS, branding Qeylo (logo, couleur orange #F97316).

### Préférences utilisateur

Nouveau champ sur modèle `User` :
- `email_notifications` : bool, default true

Quand une `Notification` est créée et `recipient.email_notifications == True` → envoi email via Resend.

### Frontend

- Toggle dans la page `/settings` pour activer/désactiver les emails de notification

---

## 3. Invitation de membres

### Modèle

Dans l'app `organizations/` :

**Invitation :**
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization | FK Organization | |
| invited_by | FK User | |
| email | varchar(254) | |
| role | enum | admin / member (default member) |
| token | UUID | unique, pour le lien |
| status | varchar(20) | pending / accepted / expired |
| created_at | datetime | auto |
| expires_at | datetime | default +7 jours |

### API

```
POST   /api/organizations/:id/invite/              → Envoie invitation (email + rôle)
GET    /api/organizations/:id/members/              → Liste des membres
DELETE /api/organizations/:id/members/:user_id/     → Retirer un membre (owner only)
PATCH  /api/organizations/:id/members/:user_id/     → Changer le rôle (owner only)
POST   /api/invite/accept/:token/                   → Accepte l'invitation
```

### Flow

1. Owner/admin envoie invitation via API
2. Backend crée `Invitation` + envoie email Resend avec lien `/invite/accept/:token`
3. Destinataire clique le lien
4. Si connecté → accepte directement, crée Membership
5. Si pas de compte → redirige vers `/register?email=X&invite=TOKEN`
6. Après register → accepte automatiquement l'invitation

### Permissions

- Owner : inviter, modifier rôles, retirer membres
- Admin : inviter, voir membres
- Member : voir membres

### Frontend

- Page `/settings/organization` : liste des membres + formulaire invitation (email + rôle)
- Page `/invite/accept/[token]` : page d'acceptation (hors auth layout)

---

## 4. Rappels automatiques

### Règles de détection

| Règle | Condition | Notification |
|---|---|---|
| Deal inactif | Pas "Gagné"/"Perdu", aucune action depuis 7 jours | "Le deal {name} n'a pas eu d'activité depuis 7 jours" |
| Tâche en retard | `is_done=False` et `due_date < now` | "La tâche {description} est en retard" |
| Tâche due aujourd'hui | `is_done=False` et `due_date = today` | "Rappel : {description} est prévue pour aujourd'hui" |
| Contact sans suivi | Pas de timeline entry depuis 30 jours | "Pas de contact avec {name} depuis 30 jours" |

### Implémentation

- Management command : `backend/notifications/management/commands/check_reminders.py`
- Parcourt toutes les organisations actives
- Applique les 4 règles
- Crée des `Notification` (in-app)
- Envoie email digest si `email_notifications == True`
- Anti-doublon : pas de rappel si un identique (même type + même objet) existe déjà non-lu

### Exécution

- Dev : commande manuelle `python manage.py check_reminders`
- Prod : cron toutes les heures ou service cron dans Docker Compose

---

## 5. Import CSV Contacts

### Flow utilisateur

1. Bouton "Importer CSV" sur page `/contacts`
2. Dialog modale 3 étapes :
   - **Upload** : drop zone, max 5 MB
   - **Mapping** : preview 5 premières lignes + dropdown colonne → champ Contact. Auto-détection par noms de colonnes.
   - **Confirmation** : résumé (X à importer, Y doublons par email). Bouton "Importer".

### API

```
POST   /api/contacts/import/preview/   → CSV multipart → headers + 5 lignes + mapping suggéré
POST   /api/contacts/import/           → CSV + mapping → {created: N, skipped: N, errors: [...]}
```

### Backend

- Parsing avec module `csv` Python (pas de dépendance)
- Doublons détectés par email (skip si email déjà dans l'org)
- Création en `bulk_create`
- Limite : 1000 contacts par import
- Notification créée à la fin : "Import terminé : X contacts créés"

### Frontend

- `ImportCSVDialog.tsx` dans `components/contacts/`
- 3 étapes dans un Dialog shadcn avec stepper visuel

---

## Ordre d'implémentation

```
1. Notifications in-app (fondation)
   ↓
2. Email via Resend (transport)
   ↓
3. Invitation de membres (consomme 1 + 2)
   ↓
4. Rappels automatiques (consomme 1 + 2)
   ↓
5. Import CSV contacts (consomme 1 pour la notif de fin)
```

---

## Dépendances nouvelles

### Backend
- `resend` — SDK Python pour l'envoi d'emails

### Frontend
- Aucune nouvelle dépendance (utilise shadcn/ui existant)

---

## Impact sur l'existant

- `User` model : ajout champ `email_notifications` (bool)
- `Sidebar.tsx` : ajout icône cloche avec badge notifications
- `organizations/` app : ajout modèle Invitation + endpoints membres
- Nouvelle app `notifications/` : modèle + API + email service + management command
- Page `/settings` : toggle email notifications
- Nouvelle page `/settings/organization` : gestion membres
- Nouvelle page `/invite/accept/[token]` : acceptation invitation
- Page `/contacts` : bouton import + dialog
