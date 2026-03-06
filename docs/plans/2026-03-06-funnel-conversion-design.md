# Entonnoir de conversion — Design

## Objectif

Visualiser les taux de conversion entre chaque etape du pipeline avec un historique reel des transitions de deals. Deux modes de filtrage (cohorte d'entree / activite) et deux points d'acces (widget dashboard + page dediee).

## Modele de donnees

### DealStageTransition

```python
class DealStageTransition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="transitions")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    from_stage = models.ForeignKey(PipelineStage, null=True, on_delete=models.SET_NULL, related_name="+")
    to_stage = models.ForeignKey(PipelineStage, on_delete=models.CASCADE, related_name="+")
    changed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    transitioned_at = models.DateTimeField(auto_now_add=True)
    duration_in_previous = models.DurationField(null=True)
```

- `from_stage=null` : creation du deal (entree dans le pipeline)
- `duration_in_previous` : calcule au moment de la transition (delta avec transition precedente)
- Filtre par `organization` pour le multi-tenant

## Capture des transitions

### A la mise a jour d'un deal

Dans `DealViewSet.perform_update()` : si `deal.stage` change :
1. Recuperer la derniere transition pour calculer `duration_in_previous`
2. Creer `DealStageTransition(from_stage=ancien, to_stage=nouveau, changed_by=request.user)`
3. Sauvegarder le deal

### A la creation d'un deal

Dans `perform_create()` : creer une transition `from_stage=null, to_stage=stage_initial`.

### Backfill des deals existants

Commande `python manage.py backfill_transitions` :
- Pour chaque deal sans transition : creer `from_stage=null, to_stage=deal.stage, transitioned_at=deal.created_at`
- `duration_in_previous=null` (donnee inconnue)
- Idempotente

## API

### POST /api/reports/funnel/

**Request :**

```json
{
  "pipeline_id": "uuid",
  "filter_mode": "cohort | activity",
  "date_range": "this_month | last_3_months | custom | ...",
  "date_from": "2026-01-01",
  "date_to": "2026-03-06"
}
```

- `cohort` : filtre les deals par date de creation
- `activity` : filtre les transitions par `transitioned_at`

**Response :**

```json
{
  "pipeline": "Prospection",
  "stages": [
    {
      "stage_id": "uuid",
      "stage_name": "Premier contact",
      "color": "#6366F1",
      "entered": 120,
      "exited_to_next": 85,
      "conversion_rate": 70.8,
      "avg_duration": "P3DT4H",
      "total_amount": 450000
    }
  ],
  "overall_conversion": 8.3,
  "total_entered": 120,
  "total_won": 10
}
```

- `entered` : deals ayant une transition vers cette etape
- `exited_to_next` : deals ayant une transition depuis cette etape vers la suivante
- `conversion_rate` : `exited_to_next / entered * 100`
- `avg_duration` : duree moyenne dans l'etape (ISO 8601)
- `overall_conversion` : deals gagnes / deals entres dans la premiere etape

## Visualisation frontend

### Composant FunnelChart (SVG custom)

Fichier : `frontend/components/reports/FunnelChart.tsx`

- Forme trapezoidale : largeur proportionnelle au `entered` par rapport a la premiere etape
- Couleurs : `color` de chaque PipelineStage
- Labels : nom de l'etape a gauche, nombre de deals + montant a droite
- Taux de conversion affiche entre chaque trapeze avec une fleche
- Duree moyenne en petit sous le nombre de deals
- Responsive via viewBox SVG

### Widget dashboard (funnel_chart)

- Nouveau type `"funnel_chart"` dans `WidgetConfig.type`
- Config : `pipeline_id`, `filter_mode`, `date_range`
- Taille recommandee : `"large"`
- Version compacte : masque durees et montants, affiche noms d'etapes, nombre de deals et taux

### Page dediee /pipeline/funnel

- Selecteur de pipeline
- Selecteur de mode (cohorte / activite) + date range
- Funnel grand format avec toutes les infos
- Tableau recapitulatif en dessous (entered, exited, conversion, duree, montant)
- `overall_conversion` affiche en gros en haut a droite

## Tests

- Changement de stage cree une transition
- `duration_in_previous` calcule correctement
- Backfill idempotent
- API funnel retourne les bons taux pour les deux modes de filtrage
