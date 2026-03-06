# Design : Assignation de tâches à un membre d'équipe

## Problème

Les tâches n'ont qu'un `created_by`, pas d'`assigned_to`. Impossible de déléguer une tâche à un ou plusieurs membres de l'équipe.

## Décisions

- **Assignation multiple** : une tâche peut avoir plusieurs assignés
- **Pas de hiérarchie** : tous les assignés sont égaux (pas de responsable principal)
- **Filtrage** : filtre par assigné + raccourci "Mes tâches"
- **Notification in-app** : réutilisation du système `Notification` existant avec un nouveau type `TASK_ASSIGNED`

## Architecture

### Approche retenue : Modèle intermédiaire `TaskAssignment`

Choisi pour stocker les métadonnées d'assignation (qui a assigné, quand) nécessaires aux notifications.

### Modèle de données

**Nouveau modèle `TaskAssignment`** (app `tasks`) :

```python
class TaskAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="assignments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_assignments")
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("task", "user")
```

**Modification du modèle `Notification`** : ajouter `TASK_ASSIGNED = "task_assigned"` dans `Notification.Type`.

### API Backend

**Serializer Task** :
- Champ write `assigned_to` : liste d'IDs utilisateurs
- Champ read `assignees` : liste d'objets `{user_id, email, first_name, last_name, assigned_at}`
- Lors du create/update : synchroniser les `TaskAssignment` (ajout nouveaux, suppression retirés)
- Créer une `Notification` de type `TASK_ASSIGNED` pour chaque nouvel assigné

**Filtrage** :
- `GET /api/tasks/?assigned_to=<user_id>` — tâches assignées à un membre
- `GET /api/tasks/?assigned_to=me` — raccourci "Mes tâches" (résolu côté view)

**Validation** : vérifier que les users assignés sont membres de l'organisation (via `Membership`).

### Frontend

**Types TypeScript** :

```typescript
export interface TaskAssignee {
  user_id: string
  email: string
  first_name: string
  last_name: string
  assigned_at: string
}

// Task existant enrichi de :
assignees: TaskAssignee[]
```

**TaskDialog** (formulaire create/edit) :
- Multi-select "Assignés" avec autocomplete sur les membres de l'organisation
- Chips/badges avec nom du membre, bouton "x" pour retirer
- Pré-rempli avec les assignés actuels en mode édition

**TaskList** (affichage) :
- Avatars (initiales) des assignés à côté de chaque tâche
- Si >3 assignés : afficher les 2 premiers + "+N"
- Tooltip au survol avec la liste complète

**Page Tâches — Filtrage** :
- Filtre "Assigné à" (même style que le filtre contact)
- Bouton/pill "Mes tâches" comme raccourci rapide

## Testing

- Test création TaskAssignment via API
- Test unicité (task, user)
- Test validation membership
- Test filtrage assigned_to et assigned_to=me
- Test notification créée lors de l'assignation
- Test suppression d'un assigné (pas de notification)
