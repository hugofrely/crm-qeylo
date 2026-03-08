# Collaboration Features Design

**Date:** 2026-03-08
**Approche retenue:** B — Nouveau modèle `Comment` séparé dans une app `collaboration`

## Contexte

Le CRM manque de fonctionnalités collaboratives : pas de @mentions, pas de commentaires internes, pas de notifications temps réel, pas de partage de notes. L'infrastructure existante (Redis, Celery, ASGI/Uvicorn) est prête pour supporter ces features.

## Décisions de design

- @mentions uniquement dans les commentaires/notes sur les fiches (contacts, deals, tâches)
- Commentaires plats (chronologiques, pas de threading)
- WebSocket complet (notifications temps réel + live updates des commentaires)
- Notes visibles par tous par défaut, option "privée" par l'auteur
- Réactions emoji sur les commentaires

---

## 1. Modèles de données

Nouvelle app Django `collaboration` avec 3 modèles.

### Comment

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID PK | |
| organization | FK → Organization | |
| author | FK → User | |
| content | TextField | Markdown/HTML depuis Tiptap |
| is_private | BooleanField (default=False) | Visible uniquement par l'auteur |
| contact | FK → Contact (nullable) | |
| deal | FK → Deal (nullable) | |
| task | FK → Task (nullable) | |
| mentioned_users | M2M → User (through=Mention) | |
| created_at | DateTimeField | |
| updated_at | DateTimeField | |
| edited_at | DateTimeField (nullable) | Affiche "modifié" |

### Mention

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID PK | |
| comment | FK → Comment | |
| user | FK → User | Utilisateur mentionné |
| created_at | DateTimeField | |

### Reaction

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID PK | |
| comment | FK → Comment | |
| user | FK → User | |
| emoji | CharField (max_length=10) | Ex: "👍", "🎉", "❤️" |
| created_at | DateTimeField | |
| Contrainte: unique_together (comment, user, emoji) | |

---

## 2. WebSocket & Notifications

### Django Channels setup

- `channels` + `channels-redis` comme channel layer
- ASGI routing : HTTP existant + WebSocket sur `/ws/`

### Consumers

**NotificationConsumer** — `/ws/notifications/`
- Auth via JWT (token en query param)
- Chaque user rejoint un group `user_{user_id}`
- Reçoit : nouvelles mentions, réactions, mises à jour

**CollaborationConsumer** — `/ws/collaboration/{entity_type}/{entity_id}/`
- Ex: `/ws/collaboration/contact/uuid-123/`
- On rejoint le group de l'entité quand on ouvre la fiche
- Reçoit : nouveau commentaire, édition, suppression, réaction

### Flow d'une mention

1. User A écrit un commentaire avec @hugo
2. POST /api/collaboration/comments/
3. Backend parse le contenu, détecte les mentions (data-mention-id)
4. Crée Comment + entrées Mention
5. Crée Notification (type: "mention")
6. Envoie via WebSocket :
   - Group `user_{hugo_id}` → notification toast
   - Group `contact_{contact_id}` → nouveau commentaire (live update)

### Nouveaux types de notification

- `mention` — "Hugo vous a mentionné dans un commentaire"
- `reaction` — "Hugo a réagi à votre commentaire"
- `comment` — "Nouveau commentaire sur [Contact X]"

---

## 3. API Endpoints

```
POST   /api/collaboration/comments/                    — créer un commentaire
GET    /api/collaboration/comments/?contact={id}        — lister les commentaires d'une fiche
PATCH  /api/collaboration/comments/{id}/                — éditer (auteur uniquement)
DELETE /api/collaboration/comments/{id}/                — supprimer (auteur uniquement)

POST   /api/collaboration/comments/{id}/reactions/      — ajouter une réaction
DELETE /api/collaboration/comments/{id}/reactions/{id}/  — retirer sa réaction

GET    /api/collaboration/mentions/me/                  — mes mentions
GET    /api/organizations/{id}/members/search/?q=       — recherche membres (autocomplete @)
```

---

## 4. Frontend — Composants

### CommentSection
- Affiché sur chaque fiche (contact, deal, tâche)
- Liste chronologique des commentaires
- Champ de saisie avec RichTextEditor + toggle "note privée" (cadenas)
- WebSocket : écoute le group de l'entité, ajoute les commentaires en live

### MentionPopup (extension Tiptap)
- Se déclenche en tapant `@`
- Autocomplete avec recherche des membres de l'organisation
- Insère un chip `@Prénom` avec `data-mention-id={user_uuid}`

### CommentItem
- Avatar + nom + date (+ "modifié" si edited_at)
- Contenu markdown/HTML
- Barre de réactions (emojis cliquables avec compteurs)
- Menu "..." pour éditer/supprimer (si auteur)
- Badge cadenas si privé

### NotificationToast
- Connecté au WebSocket `/ws/notifications/`
- Toast quand mention/réaction arrive
- Cliquable → navigation vers la fiche

### NotificationBadge (navbar)
- Compteur notifs non lues (mis à jour via WebSocket)
- Dropdown avec liste des dernières notifications

### Intégration timeline
Les commentaires s'affichent dans la timeline existante (ContactTimeline) intercalés chronologiquement avec les events système, avec un style visuel distinct (bulle de commentaire vs ligne d'event).
