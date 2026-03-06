# Design : Rappels / Notifications avant échéance

## Problème

Le système détecte les tâches en retard mais ne prévient pas avant l'échéance. Pas de rappel anticipé (1h avant, 1 jour avant).

## Décisions

- **Destinataires** : les assignés de la tâche (fallback créateur si personne assigné)
- **Délais** : configurables au niveau organisation (défaut : 1h + 1 jour)
- **Canaux** : in-app + email (système existant)
- **Approche** : Celery Beat périodique (toutes les 5 min)
- **Heure d'échéance** : optionnelle dans le TaskDialog (défaut 23:59 si non renseignée)

## Architecture

### Modèle de données

**Nouveau type notification** : `TASK_REMINDER = "task_reminder"` dans `Notification.Type`.

**Nouveau modèle `OrganizationSettings`** (app `organizations`) :

```python
class OrganizationSettings(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name="settings")
    task_reminder_offsets = models.JSONField(
        default=list,  # [60, 1440] = 1h + 24h en minutes
    )
```

Valeur par défaut : `[60, 1440]`.

**Nouveau modèle `TaskReminder`** (app `tasks`) — anti-doublon :

```python
class TaskReminder(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="reminders")
    offset_minutes = models.IntegerField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("task", "offset_minutes")
```

### Logique Celery

**Tâche `check_task_reminders`** dans `backend/tasks/celery_tasks.py` :

- Tourne toutes les 5 minutes via `CELERY_BEAT_SCHEDULE`
- Pour chaque org, récupère les offsets configurés
- Pour chaque offset, cherche les tâches non-complétées dont `due_date` tombe dans la fenêtre `[now + offset - 5min, now + offset + 5min]`
- Exclut les tâches ayant déjà un `TaskReminder` pour cet offset
- Envoie notification + crée le `TaskReminder`

**Destinataires** :

```python
def get_task_recipients(task):
    assignees = [a.user for a in task.assignments.all()]
    if assignees:
        return assignees
    if task.created_by:
        return [task.created_by]
    return []
```

**Format des titres** :
- 1440 min → "Tâche due demain"
- 60 min → "Tâche due dans 1 heure"

**Reset quand due_date change** : supprimer les `TaskReminder` existants dans `TaskSerializer.update()`.

### API

**Settings organisation** :
- `GET /api/organizations/<id>/settings/` — retourne les settings
- `PATCH /api/organizations/<id>/settings/` — met à jour (dont `task_reminder_offsets`)

**Création automatique** : signal `post_save` sur `Organization` pour créer les settings par défaut. Migration data pour les orgs existantes.

### Frontend

**TaskDialog** : ajouter un champ heure optionnel à côté de la date d'échéance (`<input type="time">`). Si non renseigné, on envoie la date avec heure 23:59.

**Page Settings Organisation** : nouvelle section "Rappels de tâches" avec :
- Chips affichant les offsets actuels (ex: "1 heure", "1 jour")
- Boutons ajouter/retirer
- Choix prédéfinis : 15 min, 30 min, 1h, 2h, 1 jour, 2 jours

## Testing

- Test Celery task : tâche due dans 1h → rappel envoyé
- Test anti-doublon : rappel déjà envoyé → pas de double envoi
- Test reset : changement due_date → TaskReminder supprimés
- Test destinataires : assignés reçoivent, créateur en fallback
- Test config : offsets custom respectés
- Test pas de rappel si tâche complétée
