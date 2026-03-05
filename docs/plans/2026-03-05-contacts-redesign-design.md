# Refonte complète des contacts

**Date :** 2026-03-05
**Statut :** Approuvé

## Résumé

Refonte complète du module contacts : catégories personnalisables, champs custom typés, nouvelle page détail avec onglets, et intégration chat IA complète.

## Architecture technique

**Approche retenue :** JSONField pour les valeurs de champs custom (Option A).

Les définitions de champs sont stockées dans un modèle dédié `CustomFieldDefinition`. Les valeurs sont stockées dans un `JSONField` sur le Contact (`custom_fields = {field_uuid: value}`). Le serializer valide les valeurs contre les définitions (type, required, options).

---

## 1. Modèle de données

### Nouveau modèle : ContactCategory

| Champ | Type | Description |
|-------|------|-------------|
| id | UUIDField | PK |
| organization | FK(Organization) | Scope org, CASCADE |
| name | CharField(100) | "Client", "Prospect", etc. |
| color | CharField(7) | Hex color "#22c55e" |
| icon | CharField(50) | Emoji optionnel |
| order | IntegerField | Ordre d'affichage |
| is_default | BooleanField | Créé automatiquement (non supprimable) |
| created_at | DateTimeField | Auto |

**Contrainte unique :** (organization, name)

### Nouveau modèle : CustomFieldDefinition

| Champ | Type | Description |
|-------|------|-------------|
| id | UUIDField | PK |
| organization | FK(Organization) | Scope org, CASCADE |
| label | CharField(150) | "Code postal", "SIRET", etc. |
| field_type | CharField | Choix : text, long_text, number, date, select, email, phone, url, checkbox |
| is_required | BooleanField | Obligatoire ? default=False |
| options | JSONField | Pour "select" : ["Option A", "Option B"], default=list |
| order | IntegerField | Ordre d'affichage dans le formulaire |
| section | CharField(50) | Groupe : "address", "professional", "custom" |
| created_at | DateTimeField | Auto |

### Modifications au modèle Contact

**Nouveaux champs :**
- `categories` — ManyToManyField(ContactCategory, blank=True)
- `custom_fields` — JSONField(default=dict, blank=True) — stocke `{field_uuid_str: value}`
- `city` — CharField(max_length=100, blank=True)
- `postal_code` — CharField(max_length=20, blank=True)
- `country` — CharField(max_length=100, blank=True)
- `state` — CharField(max_length=100, blank=True)
- `secondary_email` — EmailField(blank=True)
- `secondary_phone` — CharField(max_length=20, blank=True)
- `mobile_phone` — CharField(max_length=20, blank=True)
- `twitter_url` — URLField(blank=True)
- `siret` — CharField(max_length=14, blank=True)

### Catégories par défaut (créées à l'initialisation d'une org)

| Nom | Couleur | Ordre |
|-----|---------|-------|
| Non contacté | #3b82f6 | 0 |
| Prospect | #eab308 | 1 |
| Qualifié | #f97316 | 2 |
| Client | #22c55e | 3 |
| Ancien client | #ef4444 | 4 |
| Partenaire | #a855f7 | 5 |
| VIP | #f59e0b | 6 |

---

## 2. API Backend

### Endpoints catégories — `/api/contacts/categories/`

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/contacts/categories/` | Liste des catégories de l'org, triées par order |
| POST | `/api/contacts/categories/` | Créer une catégorie (name, color, icon) |
| PATCH | `/api/contacts/categories/{id}/` | Modifier nom, couleur, ordre |
| DELETE | `/api/contacts/categories/{id}/` | Supprimer (interdit si is_default=True) |
| POST | `/api/contacts/categories/reorder/` | Body: `{order: [uuid1, uuid2, ...]}` |

### Endpoints custom fields — `/api/contacts/custom-fields/`

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/contacts/custom-fields/` | Liste des définitions de l'org, triées par order |
| POST | `/api/contacts/custom-fields/` | Créer (label, field_type, is_required, options, section) |
| PATCH | `/api/contacts/custom-fields/{id}/` | Modifier |
| DELETE | `/api/contacts/custom-fields/{id}/` | Supprimer (supprime les valeurs dans tous les contacts) |
| POST | `/api/contacts/custom-fields/reorder/` | Body: `{order: [uuid1, uuid2, ...]}` |

### Modifications endpoints contacts

- `GET /api/contacts/` — nouveau query param `?category={uuid}` pour filtrer. Réponse inclut `categories` (liste d'objets) et `custom_fields` (dict).
- `GET /api/contacts/{id}/` — inclut catégories et custom fields complets.
- `PATCH /api/contacts/{id}/` — accepte `category_ids: [uuid1, uuid2]` et `custom_fields: {uuid: value}`. Le serializer valide les types des custom fields.
- `POST /api/contacts/` — idem pour la création.

### Validation custom fields (dans le serializer)

Pour chaque entrée dans `custom_fields` :
1. Vérifier que le field_uuid correspond à une définition existante de l'org
2. Valider le type (number → float/int, date → format ISO, email → format email, etc.)
3. Pour les champs "select", vérifier que la valeur est dans `options`
4. Vérifier les champs required à la sauvegarde

---

## 3. Frontend — Page liste des contacts

### Layout

```
┌─────────────────────────────────────────────────┐
│ NAVBAR (SearchHeader existant)                  │
├──────┬──────────────────────────────────────────┤
│      │ [Tous (42)] [🟢 Client (12)] [🟡 ...    │
│      │ [+ Ajouter]  [Import CSV]  🔍 Recherche │
│      ├──────────────────────────────────────────┤
│ SIDE │  Tableau contacts paginé                 │
│ BAR  │  Colonnes: Nom, Catégories, Entreprise,  │
│      │  Email, Téléphone, Score, Date création  │
│      │                                          │
│      │  Badges catégories sous le nom           │
│      │  Pagination en bas                       │
└──────┴──────────────────────────────────────────┘
```

### Fonctionnalités

- **Onglets catégories** en haut avec compteur par catégorie
- Onglet "Tous" montre tous les contacts
- **Filtrage** : catégorie sélectionnée + recherche texte combinés
- **Badges catégories** colorés sous le nom dans chaque ligne du tableau
- **Responsive** : colonnes masquées progressivement sur mobile/tablette
- **Actions rapides** : Ajouter contact, Import CSV (existants)

---

## 4. Frontend — Page détail contact

### Layout 2 colonnes

**Panneau gauche (~1/3) — Informations contact :**

1. **En-tête** : Avatar/Photo, Nom complet, Poste @ Entreprise
2. **Actions rapides** : Boutons Email, Appeler, Modifier, Supprimer
3. **Coordonnées** : Tous les emails, téléphones, adresse complète, LinkedIn, Website, Twitter
4. **Catégories** : Badges colorés avec bouton [+ Ajouter] ouvrant un popover de sélection
5. **Qualification** : Lead score (badge coloré), Budget estimé, Rôle décisionnel, Besoins identifiés
6. **Champs custom** : Affichage dynamique basé sur les définitions org, regroupés par section
7. **Résumé IA** : Section avec icône Sparkles, summary auto-généré, date de mise à jour
8. **Édition inline** : Chaque section a un bouton crayon pour passer en mode édition

**Panneau droit (~2/3) — Onglets :**

| Onglet | Contenu |
|--------|---------|
| **Activités** | Timeline des interactions (appels, meetings, customs) avec métadonnées (durée, participants, lieu). Bouton "Logger une activité". |
| **Notes** | Liste chronologique des notes. Éditeur texte pour en ajouter. |
| **Emails** | Historique des emails envoyés/reçus. Bouton "Envoyer un email". |
| **Tâches** | Tâches liées au contact avec statut, priorité, deadline. Bouton "Créer une tâche". |
| **Deals** | Deals associés avec étape pipeline, montant, probabilité. Lien vers le deal. |
| **Historique** | Journal des modifications : qui a changé quoi, quand (timeline entries de type contact_updated). |

---

## 5. Paramètres organisation

Nouvelle section dans les paramètres org, ajoutée après "Invitations" :

### Catégories de contacts

- Liste des catégories avec drag & drop pour réordonner
- Chaque catégorie affiche : pastille couleur, nom, badge "Défaut" si is_default
- Actions : Modifier (dialog avec nom + color picker), Supprimer (sauf défaut, avec confirmation)
- Bouton [+ Ajouter une catégorie] en bas

### Champs personnalisés

- Liste des champs avec drag & drop pour réordonner
- Chaque champ affiche : label, type (badge), "Requis" si is_required
- Actions : Modifier (dialog avec label, type, required, options si select), Supprimer (avec confirmation + warning "les données seront perdues")
- Bouton [+ Ajouter un champ] en bas

---

## 6. Intégration Chat IA

### Context dynamique dans le system prompt

```python
# Injecté dans le prompt système
categories = ContactCategory.objects.filter(organization=org)
custom_fields = CustomFieldDefinition.objects.filter(organization=org)

context = f"""
Catégories de contacts disponibles: {', '.join(c.name for c in categories)}
Champs personnalisés disponibles: {', '.join(f'{cf.label} ({cf.field_type})' for cf in custom_fields)}
"""
```

### Nouveaux tools

**update_contact_categories(contact_id, category_names)**
- Prend une liste de noms de catégories
- Résout les noms vers les UUIDs
- Met à jour la relation M2M
- Crée une entrée timeline

**update_custom_field(contact_id, field_label, value)**
- Prend le label du champ (pas l'UUID, plus naturel pour l'IA)
- Résout le label vers la définition
- Valide le type et met à jour custom_fields[uuid]
- Crée une entrée timeline

**Modification des tools existants :**
- `create_contact` : accepte `categories` (liste de noms) et `custom_fields` (dict label→value)
- `update_contact` : accepte `categories` et `custom_fields` en plus des champs existants
- `search_contacts` : accepte `category` pour filtrer par catégorie

### Exemples d'interactions

- "Ajoute Jean Dupont en tant que client VIP" → create_contact + update_contact_categories
- "Mets à jour le SIRET de Jean à 123456789" → update_custom_field
- "Passe Marie de Prospect à Client" → update_contact_categories
- "Montre-moi tous les contacts non contactés" → search_contacts(category="Non contacté")
- "Ajoute le champ 'Numéro TVA' à notre CRM" → Non géré par l'IA (admin seulement via UI)

---

## 7. Migration des données existantes

- Le champ `tags` existant sera conservé (différent des catégories)
- Le champ `address` (TextField) sera conservé pour la rétro-compatibilité, les nouveaux champs `city`, `postal_code`, `country`, `state` sont additionnels
- Les catégories par défaut sont créées via une data migration pour les orgs existantes
- Pas de perte de données
