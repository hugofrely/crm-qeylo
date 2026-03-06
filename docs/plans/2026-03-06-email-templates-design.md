# Email Templates - Design Document

**Date**: 2026-03-06
**Status**: Approved

## Objectif

Ajouter des templates d'email reutilisables au CRM, permettant aux utilisateurs de creer, organiser et reutiliser des modeles d'emails avec variables de personnalisation. Fonctionnalite standard chez HubSpot/Pipedrive.

## Decisions cles

- **Approche**: HTML brut TipTap stocke tel quel, variables resolues par substitution regex cote backend
- **Editeur**: TipTap enrichi (blocs CTA, image, separateur + menu variables) — pas de builder drag-and-drop
- **Visibilite**: Templates prives (par utilisateur) + partages (par organisation)
- **Variables**: Contact + Deal
- **Integration**: ComposeEmailDialog + Workflows + Chat IA
- **Categorisation**: Tags libres

## Modele de donnees

### EmailTemplate

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID, PK | Identifiant unique |
| organization | FK -> Organization | Organisation proprietaire |
| created_by | FK -> User | Createur du template |
| name | varchar(255) | Nom du template (ex: "Relance apres devis") |
| subject | varchar(500) | Objet de l'email, supporte les variables |
| body_html | text | Corps HTML TipTap avec variables |
| tags | JSONField, default=[] | Tags libres pour filtrage |
| is_shared | boolean, default=False | False = prive, True = partage orga |
| created_at | datetime | Date de creation |
| updated_at | datetime | Derniere modification |

**Contraintes:**
- Template prive (`is_shared=False`): visible uniquement par `created_by`
- Template partage (`is_shared=True`): visible par tous les membres de l'organisation
- Seul `created_by` peut modifier/supprimer un template (meme partage)

### Variables supportees

**Contact:** `{{contact.first_name}}`, `{{contact.last_name}}`, `{{contact.email}}`, `{{contact.company}}`, `{{contact.phone}}`

**Deal:** `{{deal.name}}`, `{{deal.amount}}`, `{{deal.stage}}`

## API Backend

### Endpoints

```
GET    /email/templates/              — Liste (prives + partages orga)
POST   /email/templates/              — Creer
GET    /email/templates/{id}/         — Detail
PUT    /email/templates/{id}/         — Modifier
DELETE /email/templates/{id}/         — Supprimer
POST   /email/templates/{id}/render/  — Rendre avec variables resolues
```

### Filtrage (GET list)

- Retourne: `created_by = user` OU `(is_shared = True AND organization = user.org)`
- Query params: `?search=`, `?tag=`, `?shared_only=true`, `?mine_only=true`
- Tri: `updated_at` desc

### Endpoint /render/

- Recoit `contact_id` et optionnellement `deal_id`
- Resout toutes les variables `{{...}}` dans subject et body_html
- Retourne le HTML final
- Utilise par: ComposeEmailDialog (preview), Workflows, Chat IA

### Permissions

- Creer: tout membre authentifie de l'organisation
- Lire: auteur OU membre de l'orga si `is_shared=True`
- Modifier/Supprimer: uniquement `created_by`

## Frontend

### Page de gestion: `/settings/email-templates`

- Liste des templates avec recherche par nom et filtrage par tags
- Toggle "Mes templates" / "Templates partages"
- Bouton "Nouveau template"

### Page creation/edition: `/settings/email-templates/[id]`

- Champ nom du template
- Champ objet (subject) avec insertion de variables
- Editeur TipTap enrichi:
  - Toolbar + boutons: Bouton CTA, Image, Separateur
  - Menu d'insertion de variables (dropdown groupe Contact/Deal)
  - Variables affichees comme badges inline non-editables (TipTap Node custom)
- Tags: input avec auto-completion sur tags existants de l'orga
- Checkbox "Partager avec l'organisation"
- Bouton Preview: appelle `/render/` avec contact de test
- Sauvegarder

### Integration ComposeEmailDialog

- Bouton "Utiliser un template" en haut du dialog
- Dropdown/dialog avec liste des templates disponibles
- Selection remplit subject et body
- Variables resolues a l'envoi

### Integration Workflows

- Selecteur de template dans le noeud action "Envoyer un email"
- Subject et body pre-remplis depuis le template
- Variables resolues a l'execution du workflow

### Integration Chat IA

- Nouveaux tools: `list_email_templates`, `send_email_from_template`
- L'agent peut lister et utiliser les templates existants

## Substitution des variables

### Mecanisme

Fonction `render_template(body_html, subject, context)`:
1. Recoit un dict context avec objets `contact` et `deal` (optionnel)
2. Regex `\{\{(\w+\.\w+)\}\}` pour trouver les variables
3. Resout: `contact.first_name` -> `context["contact"].first_name`
4. Variables non resolues -> chaine vide
5. Retourne `(rendered_subject, rendered_body_html)`

### Modification de send_email()

- Nouveau parametre optionnel `template_id`
- Si fourni: charge le template, appelle `render_template()`, utilise le resultat
- Stocke `template_id` dans SentEmail pour tracabilite

## Stack technique

- **Backend**: Django model + DRF ViewSet + service layer
- **Frontend**: Next.js pages + TipTap extensions custom
- **Pas de nouvelles dependances** requises
