# Contact Enrichment Design

## Objectif

Enrichir le modele Contact avec des champs supplementaires pour centraliser toutes les infos sur chaque contact. Ajouter un resume IA auto-genere. Tous les champs sont editables par l'utilisateur ET l'IA via le chat.

## Nouveaux champs

### Profil enrichi

| Champ | Type | Description |
|-------|------|-------------|
| `job_title` | CharField(150) | Poste/titre |
| `linkedin_url` | URLField | Profil LinkedIn |
| `website` | URLField | Site web |
| `address` | TextField | Adresse postale |
| `industry` | CharField(150) | Secteur d'activite |

### Qualification commerciale

| Champ | Type | Description |
|-------|------|-------------|
| `lead_score` | CharField choices (hot/warm/cold) | Temperature du lead |
| `estimated_budget` | DecimalField(10,2) | Budget estime |
| `identified_needs` | TextField | Besoins identifies |
| `decision_role` | CharField choices (decision_maker/influencer/user/other) | Role dans la decision |

### Preferences & contexte

| Champ | Type | Description |
|-------|------|-------------|
| `preferred_channel` | CharField choices (email/phone/linkedin/other) | Canal prefere |
| `timezone` | CharField(50) | Fuseau horaire |
| `language` | CharField(10) | Langue |
| `interests` | JSONField (array) | Centres d'interet |
| `birthday` | DateField | Anniversaire |

### Resume IA

| Champ | Type | Description |
|-------|------|-------------|
| `ai_summary` | TextField | Resume auto-genere |
| `ai_summary_updated_at` | DateTimeField | Derniere MAJ du resume |

## Resume IA automatique

Declenchement : quand une action touche un contact (note ajoutee, deal cree/deplace, contact modifie), on regenere le resume en arriere-plan.

Le resume synthetise :
- Infos du contact (poste, entreprise, secteur)
- Historique timeline (notes, actions, events)
- Deals associes (statut, montant)
- Qualification (score, besoins, role)

Implementation : appel LLM asynchrone declenche dans les vues apres creation de TimelineEntry.

## Tool IA update_contact

Ajouter un tool `update_contact(contact_id, **fields)` au chat agent pour que l'IA puisse modifier n'importe quel champ du contact. Le tool :
- Accepte l'ID du contact + les champs a modifier
- Valide les valeurs (choices, types)
- Sauvegarde et cree un TimelineEntry de type CONTACT_UPDATED
- Declenche la regeneration du resume IA

## Frontend — Fiche contact enrichie

Reorganiser la page contact en sections :
- **En-tete** : Nom, entreprise, score lead (badge colore)
- **Coordonnees** : Email, telephone, LinkedIn, site web, adresse
- **Profil pro** : Poste, secteur, role decisionnel
- **Qualification** : Score, budget, besoins
- **Preferences** : Canal, langue, fuseau, interets, anniversaire
- **Resume IA** : Encart distinct avec date de derniere MAJ
- **Timeline** : Historique (existant)

Tous les champs sont editables inline par l'utilisateur.

## Serializer

Ajouter tous les nouveaux champs au ContactSerializer. Les champs `ai_summary_updated_at` est read-only.

## Approche technique

- Champs directs sur le modele Django (pas de JSONField sauf interests)
- Migration Django pour ajouter les champs (tous optionnels/blank)
- Pas de breaking change sur l'API existante
