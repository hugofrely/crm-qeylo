# Module Comptes/Entreprises (Companies) — Design

**Date:** 2026-03-07
**Statut:** Validé
**Priorité:** Critique (B2B)

## Contexte

Le CRM n'a pas de module Comptes/Entreprises dédié. Les contacts ont un champ `company` (CharField texte libre) mais il n'existe pas de fiche entreprise avec hiérarchie, contacts liés, deals liés, CA total, ni vue organigramme.

## Approche retenue

Modèle `Company` dédié dans une nouvelle app Django `companies/`, avec FK `parent` pour la hiérarchie multi-niveaux et un modèle `ContactRelationship` pour les relations typées entre contacts (organigramme).

---

## Section 1 — Modèles de données

### Modèle Company

```python
class Company(SoftDeleteModel):
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    organization = ForeignKey(Organization, on_delete=CASCADE, related_name='companies')

    # Identité
    name = CharField(max_length=255)
    domain = CharField(max_length=255, blank=True, default="")
    logo_url = URLField(blank=True, default="")
    industry = CharField(max_length=100, blank=True, default="")

    # Hiérarchie (multi-niveaux illimité)
    parent = ForeignKey('self', null=True, blank=True, on_delete=SET_NULL, related_name='subsidiaries')

    # Financier
    annual_revenue = DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    employee_count = IntegerField(null=True, blank=True)
    siret = CharField(max_length=17, blank=True, default="")
    vat_number = CharField(max_length=20, blank=True, default="")
    legal_status = CharField(max_length=100, blank=True, default="")

    # Relationnel
    owner = ForeignKey(User, null=True, blank=True, on_delete=SET_NULL, related_name='owned_companies')
    source = CharField(max_length=100, blank=True, default="")
    health_score = CharField(max_length=20, choices=[
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('at_risk', 'At Risk'),
        ('churned', 'Churned'),
    ], default='good')

    # Coordonnées
    phone = CharField(max_length=20, blank=True, default="")
    email = EmailField(blank=True, default="")
    website = URLField(blank=True, default="")
    address = TextField(blank=True, default="")
    city = CharField(max_length=100, blank=True, default="")
    state = CharField(max_length=100, blank=True, default="")
    zip_code = CharField(max_length=20, blank=True, default="")
    country = CharField(max_length=100, blank=True, default="")

    # Meta
    description = TextField(blank=True, default="")
    custom_fields = JSONField(default=dict, blank=True)
    ai_summary = TextField(blank=True, default="")

    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Modification du modèle Contact

```python
# Remplacer le CharField "company" par une FK
company = ForeignKey('companies.Company', null=True, blank=True, on_delete=SET_NULL, related_name='contacts')
```

### Modèle ContactRelationship

```python
class ContactRelationship(Model):
    id = UUIDField(primary_key=True, default=uuid.uuid4)
    organization = ForeignKey(Organization, on_delete=CASCADE)

    from_contact = ForeignKey(Contact, on_delete=CASCADE, related_name='relationships_from')
    to_contact = ForeignKey(Contact, on_delete=CASCADE, related_name='relationships_to')
    relationship_type = CharField(max_length=30, choices=[
        ('reports_to', 'Reports to'),
        ('manages', 'Manages'),
        ('assistant_of', 'Assistant of'),
        ('colleague', 'Colleague'),
        ('decision_maker', 'Decision maker'),
        ('influencer', 'Influencer'),
        ('champion', 'Champion'),
        ('blocker', 'Blocker'),
    ])
    notes = TextField(blank=True, default="")
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['from_contact', 'to_contact', 'relationship_type']
```

### Modification du modèle Deal

```python
# Ajout FK vers Company
company = ForeignKey('companies.Company', null=True, blank=True, on_delete=SET_NULL, related_name='deals')
```

---

## Section 2 — Backend API

### Endpoints Company

```
GET    /api/companies/                    # Liste paginée, filtrable, triable
POST   /api/companies/                    # Créer
GET    /api/companies/{id}/               # Détail
PATCH  /api/companies/{id}/               # Modifier
DELETE /api/companies/{id}/               # Soft delete

GET    /api/companies/{id}/contacts/      # Contacts liés
GET    /api/companies/{id}/deals/         # Deals liés
GET    /api/companies/{id}/subsidiaries/  # Filiales (récursif)
GET    /api/companies/{id}/hierarchy/     # Arbre complet (mère + filiales)
GET    /api/companies/{id}/timeline/      # Timeline agrégée
GET    /api/companies/{id}/stats/         # CA total, nb deals, pipeline value
GET    /api/companies/{id}/org-chart/     # Organigramme contacts avec relations
```

### Endpoints ContactRelationship

```
GET    /api/contacts/{id}/relationships/      # Relations d'un contact
POST   /api/contacts/{id}/relationships/      # Créer une relation
DELETE /api/contact-relationships/{id}/       # Supprimer
```

### Filtres liste Companies

```
?search=acme
?industry=tech
?owner={user_id}
?health_score=at_risk
?parent={company_id}
?has_open_deals=true
?ordering=-annual_revenue   # name, annual_revenue, employee_count, created_at
```

### Champs calculés (annotés en DB)

- contacts_count
- deals_count
- open_deals_value
- won_deals_value
- subsidiaries_count
- last_interaction

---

## Section 3 — Frontend

### Nouvelles routes

```
/companies          → Liste des entreprises (tableau)
/companies/{id}     → Fiche entreprise détaillée
```

### Page Liste /companies

Même pattern que la page contacts :
- Header avec titre, compteur, bouton "Nouvelle entreprise"
- Barre de filtres : recherche, secteur, owner, health score, has_open_deals
- Tableau : Nom, Secteur, Contacts, Deals ouverts, CA gagné, Owner, Santé, Dernière interaction
- Pagination standard
- Lien sidebar avec icône Building2 (Lucide), entre Contacts et Deals

### Fiche entreprise /companies/{id}

Layout 2 colonnes (comme fiche contact) :

**Colonne gauche — Tabs :**

| Tab | Contenu |
|-----|---------|
| Résumé | Description, AI summary, métriques clés, dernières activités |
| Contacts | Liste contacts liés avec job_title, email, tel. Lier/créer/délier |
| Deals | Deals liés (nom, montant, stage, contact). Créer deal. Mini-pipeline |
| Organigramme | Graphe interactif React Flow des contacts avec relations typées |
| Hiérarchie | Arbre entreprise mère → filiales multi-niveaux. Navigation cliquable |
| Timeline | Timeline agrégée de tous les contacts de l'entreprise |

**Colonne droite — Sidebar :**
- Infos entreprise éditables inline
- Owner (sélecteur membre)
- Santé du compte (badge coloré)
- Source
- Entreprise mère (lien + sélecteur)
- Custom fields

### Composants à créer

```
frontend/components/companies/
├── CompanyHeader.tsx
├── CompanyInfo.tsx
├── CompanyContacts.tsx
├── CompanyDeals.tsx
├── CompanyOrgChart.tsx       # React Flow (déjà utilisé pour workflows)
├── CompanyHierarchy.tsx
├── CompanyTimeline.tsx
├── CompanyStats.tsx
├── CompanyForm.tsx
├── CompanyTable.tsx
└── RelationshipDialog.tsx
```

### Modifications composants existants

- **Sidebar.tsx** — lien "Entreprises" avec Building2
- **ContactHeader.tsx** — nom entreprise comme lien cliquable
- **ContactInfo.tsx** — remplacer champ texte company par autocomplete Company
- **DealForm.tsx** — sélecteur Company (auto-rempli via contact)
- **SearchHeader.tsx** — inclure companies dans recherche globale

---

## Section 4 — Outils Chat IA (~15 nouveaux tools)

### CRUD

- `create_company(name, industry?, website?, parent_name?, owner?, ...)`
- `get_company(company_name_or_id)`
- `search_companies(query?, industry?, health_score?, has_open_deals?)`
- `update_company(company_name_or_id, **fields)`
- `delete_company(company_name_or_id)`

### Intelligence

- `get_company_stats(company_name_or_id)` — CA, pipeline, deals, contacts, dernière interaction
- `get_company_contacts(company_name_or_id, role?)` — avec filtre rôle
- `get_company_deals(company_name_or_id, stage?)` — deals liés
- `get_company_hierarchy(company_name_or_id)` — arbre complet avec stats
- `get_company_org_chart(company_name_or_id)` — contacts + relations
- `get_company_summary(company_name_or_id)` — génère/met à jour ai_summary

### Actions

- `link_contact_to_company(contact, company)` — lier un contact
- `unlink_contact_from_company(contact)` — délier
- `create_contact_relationship(from, to, type, notes?)` — relation typée
- `remove_contact_relationship(from, to, type)` — supprimer relation
- `transfer_contacts(from_company, to_company)` — transférer contacts
- `set_parent_company(company, parent)` — définir entreprise mère

### Modifications outils existants

- `create_contact` — paramètre `company_name` (recherche/création auto)
- `search_contacts` — filtre par `company_name`
- `create_deal` — paramètre `company_name`
- `search_all` — inclure companies
- `get_dashboard_summary` — métriques companies

### Enrichissement contexte IA

Ajouter au system prompt : nombre d'entreprises, top 5 par CA, entreprises at_risk.

---

## Section 5 — Migration & Intégration

### Migration automatique des données

```
1. Créer modèle Company (migration Django)
2. Ajouter company FK sur Contact (nullable) + garder ancien champ temporairement
3. Commande manage.py migrate_companies :
   - SELECT DISTINCT company FROM contacts WHERE company != ''
   - Créer Company(name=valeur) pour chaque valeur unique
   - UPDATE contacts SET company_id = Company.id
   - Log résultats
4. Ajouter company FK sur Deal (nullable)
   - Auto-remplir via contact.company pour les deals existants
5. Supprimer ancien CharField company (migration suivante après validation)
```

### Soft delete

- Company hérite de SoftDeleteModel
- Suppression : contacts → company=NULL, deals → company=NULL, filiales → parent=NULL
- Visible dans /trash avec restauration

### Intégration modules existants

| Module | Intégration |
|--------|------------|
| Contacts | FK vers Company, autocomplete, lien cliquable |
| Deals | FK vers Company, auto-rempli via contact |
| Search globale | Companies dans résultats |
| Trash | Companies dans corbeille |
| Segments | Critères : company.industry, company.health_score |
| Workflows | Trigger : company créée/modifiée. Action : update company |
| Dashboard | Widgets : top companies, at_risk, répartition secteur |
| Duplicate detection | Doublons sur nom + domain |

### Permissions

Même modèle que les autres entités : scoped par Organization, rôles Owner/Admin/Member. Pas de permissions spécifiques Company pour cette v1.
