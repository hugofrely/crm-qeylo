# CSV Import — Full Field Mapping + Custom Fields

## Contexte

L'import CSV actuel ne supporte que 6 champs (prénom, nom, email, téléphone, entreprise, source). Le modèle Contact en a ~30 et il existe un système de custom fields. L'objectif est de permettre le mapping vers tous les champs natifs + les custom fields de l'organisation.

## Décisions

- **Approche UI** : Combobox searchable (Popover + Command shadcn) avec groupes de champs
- **Validation custom fields** : Souple — valeurs invalides converties en null avec warning
- **Sample CSV** : Inchangé

---

## Backend

### 1. FIELD_ALIASES étendu

Étendre le dictionnaire d'auto-detection à tous les champs natifs :

```python
FIELD_ALIASES = {
    # Identité
    "first_name": ["first_name", "prénom", "prenom", "firstname"],
    "last_name": ["last_name", "nom", "lastname", "surname"],
    "email": ["email", "e-mail", "mail", "courriel"],
    "phone": ["phone", "téléphone", "telephone", "tel"],
    "mobile_phone": ["mobile_phone", "mobile", "portable"],
    "secondary_email": ["secondary_email", "email2", "email_secondaire"],
    "secondary_phone": ["secondary_phone", "tel2", "telephone2"],
    # Entreprise
    "company": ["company", "entreprise", "société", "societe", "organization"],
    "job_title": ["job_title", "poste", "position", "titre", "fonction"],
    "industry": ["industry", "secteur", "industrie"],
    "siret": ["siret"],
    # Localisation
    "address": ["address", "adresse"],
    "city": ["city", "ville"],
    "postal_code": ["postal_code", "code_postal", "cp", "zip"],
    "country": ["country", "pays"],
    "state": ["state", "région", "region"],
    # Qualification
    "lead_score": ["lead_score", "score"],
    "estimated_budget": ["estimated_budget", "budget"],
    "decision_role": ["decision_role", "rôle", "role"],
    "identified_needs": ["identified_needs", "besoins"],
    # Préférences
    "preferred_channel": ["preferred_channel", "canal"],
    "timezone": ["timezone", "fuseau"],
    "language": ["language", "langue"],
    "birthday": ["birthday", "anniversaire", "date_naissance"],
    # Réseaux
    "linkedin_url": ["linkedin_url", "linkedin"],
    "twitter_url": ["twitter_url", "twitter"],
    "website": ["website", "site_web", "site"],
    # Divers
    "notes": ["notes", "commentaires", "remarques"],
    "source": ["source", "origine"],
}
```

### 2. Endpoint preview — renvoyer les custom fields

Le preview renvoie en plus la liste des custom field definitions de l'organisation :

```python
from .models import CustomFieldDefinition

custom_fields = list(
    CustomFieldDefinition.objects.filter(organization=request.organization)
    .order_by("order")
    .values("id", "label", "field_type", "is_required", "options")
)

# Ajouté à la Response :
"custom_field_definitions": custom_fields
```

### 3. Endpoint import — tous les champs natifs + custom fields

Convention de mapping : les custom fields utilisent le préfixe `custom::<field_id>`.

```python
NATIVE_FIELDS = {f.name for f in Contact._meta.get_fields() if hasattr(f, 'column')}
NATIVE_FIELDS -= {"id", "organization_id", "created_by_id", "created_at", "updated_at",
                   "ai_summary", "ai_summary_updated_at", "custom_fields"}

# Pour chaque ligne CSV :
data = {}
custom_data = {}
for csv_col, field in mapping.items():
    value = row.get(csv_col, "").strip()
    if not value:
        continue
    if field.startswith("custom::"):
        custom_data[field.replace("custom::", "")] = value
    elif field in NATIVE_FIELDS:
        data[field] = value

contact = Contact(organization=org, created_by=request.user, **data)
if custom_data:
    contact.custom_fields = custom_data
```

### 4. Validation souple des custom fields

Pour chaque valeur custom field :
- **number** : tenter `float(value)`, sinon `null` + warning
- **date** : tenter parse ISO/FR, sinon `null` + warning
- **select** : vérifier que la valeur est dans les options, sinon `null` + warning
- **email/url** : validation basique, sinon `null` + warning
- **checkbox** : convertir "oui/yes/true/1" → true, sinon false
- **text/long_text/phone** : pas de validation

Les warnings sont ajoutés au tableau `errors` du résultat avec le format :
`"Ligne X : valeur ignorée pour '{field_label}' (format invalide)"`

---

## Frontend

### 1. Combobox de mapping (Popover + Command)

Remplacer les `<select>` par un combobox searchable avec les groupes suivants :

| Groupe | Champs |
|--------|--------|
| Identité | first_name, last_name, email, phone, mobile_phone, secondary_email, secondary_phone |
| Entreprise | company, job_title, industry, siret |
| Localisation | address, city, postal_code, country, state |
| Qualification | lead_score, estimated_budget, decision_role, identified_needs |
| Préférences | preferred_channel, timezone, language, birthday |
| Réseaux | linkedin_url, twitter_url, website |
| Divers | notes, source, tags |
| Champs personnalisés | (dynamique depuis custom_field_definitions) |

Un champ déjà mappé à une autre colonne est grisé pour éviter les doublons.

### 2. CONTACT_FIELDS → FIELD_GROUPS

```typescript
const FIELD_GROUPS = [
  { label: "Identité", fields: [
    { value: "first_name", label: "Prénom" },
    { value: "last_name", label: "Nom" },
    { value: "email", label: "Email" },
    // ...
  ]},
  // ... autres groupes
]

// Custom fields ajoutés dynamiquement :
{ label: "Champs personnalisés", fields: preview.custom_field_definitions.map(cf => ({
    value: `custom::${cf.id}`,
    label: cf.label,
  }))
}
```

### 3. Résultat enrichi

L'étape 3 affiche les warnings de validation souple en plus des erreurs et doublons.
