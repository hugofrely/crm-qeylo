# Soft Delete / Corbeille — Design

**Date:** 2026-03-06
**Statut:** Approuve

## Contexte

Actuellement, toutes les suppressions dans le CRM sont definitives. Pas de moyen de recuperer un contact, deal ou task supprime par erreur.

## Decisions

- **Modeles concernes :** Contact, Deal, Task
- **Retention :** 30 jours avant purge automatique
- **Acces corbeille :** Tous les membres de l'organisation
- **Interface :** Page centralise `/trash` avec onglets
- **Cascade :** Supprimer un Contact soft-delete aussi ses Deals et Tasks lies
- **Approche technique :** Mixin `SoftDeleteModel` (pas de lib tierce, pas de table separee)

## Architecture Backend

### Mixin SoftDeleteModel

Fichier : `backend/core/models.py`

```python
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class AllObjectsManager(models.Manager):
    pass

class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(User, null=True, blank=True, on_delete=SET_NULL)
    deletion_source = models.CharField(max_length=255, null=True, blank=True)

    objects = SoftDeleteManager()       # default: actifs uniquement
    all_objects = AllObjectsManager()   # tout inclus

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=["deleted_at", "deleted_by"])

    def restore(self):
        self.deleted_at = None
        self.deleted_by = None
        self.deletion_source = None
        self.save(update_fields=["deleted_at", "deleted_by", "deletion_source"])

    def hard_delete(self):
        super().delete()

    @property
    def is_deleted(self):
        return self.deleted_at is not None
```

### Application aux modeles

- `Contact(SoftDeleteModel, ...)` : cascade vers Deals et Tasks lies
- `Deal(SoftDeleteModel, ...)` : cascade vers Tasks liees
- `Task(SoftDeleteModel, ...)` : pas de cascade

### Logique de cascade

Suppression d'un Contact :
1. Contact recoit `deleted_at` + `deletion_source = "direct"`
2. Ses Deals recoivent `deleted_at` + `deletion_source = "cascade_contact:{contact_id}"`
3. Les Tasks du contact ET de ses deals : `deletion_source = "cascade_contact:{contact_id}"`

Restauration d'un Contact :
- Tout ce qui a `deletion_source = "cascade_contact:{id}"` est restaure automatiquement

Suppression d'un Deal :
1. Deal recoit `deleted_at` + `deletion_source = "direct"`
2. Ses Tasks recoivent `deleted_at` + `deletion_source = "cascade_deal:{deal_id}"`

## Architecture API

### Modification des ViewSets existants

Les `destroy()` de ContactViewSet, DealViewSet, TaskViewSet appellent `soft_delete(user)` au lieu de `delete()`. Response reste `204 No Content`.

### Nouveaux endpoints

```
GET    /api/trash/                   — liste tous les items supprimes (contacts, deals, tasks)
POST   /api/trash/restore/           — restaurer items   { type: "contact", ids: [...] }
DELETE /api/trash/permanent-delete/  — suppr. definitive { type: "contact", ids: [...] }
DELETE /api/trash/empty/             — vider toute la corbeille
```

Response de `GET /api/trash/` :
```json
[
  {
    "type": "contact",
    "id": "uuid",
    "name": "Jean Dupont",
    "deleted_at": "2026-03-06T10:00:00Z",
    "deleted_by": "Hugo",
    "deletion_source": "direct"
  }
]
```

Filtrable par `?type=contact`, triable par `deleted_at`.

### Purge automatique (Celery)

Tache periodique `purge_trash` chaque nuit :
- Hard delete items avec `deleted_at` > 30 jours
- Ordre : Tasks -> Deals -> Contacts (respect des FK)

## Architecture Frontend

### Page `/trash`

- Accessible depuis la sidebar (icone corbeille)
- 3 onglets : Contacts / Deals / Tasks avec compteurs
- Tableau par onglet : Nom, Supprime par, Date, Source (direct/cascade)
- Actions : restaurer, supprimer definitivement (ligne + bulk)
- Bouton "Vider la corbeille" avec confirmation modale
- Items cascades : badge "Supprime avec {Contact X}"
- Banniere info : "Les elements sont supprimes definitivement apres 30 jours"

### Toast "Annuler"

Apres chaque suppression, toast avec bouton "Annuler" pendant 5 secondes qui appelle `restore` immediatement.

### Fichiers frontend

- `frontend/services/trash.ts` : `getTrash()`, `restoreItems()`, `permanentDelete()`, `emptyTrash()`
- `frontend/hooks/useTrash.ts` : React Query hook
- `frontend/app/(app)/trash/page.tsx` : page corbeille
