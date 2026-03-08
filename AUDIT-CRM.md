# Audit CRM Qeylo - Comparatif HubSpot & Salesforce

> Audit complet des fonctionnalites de Qeylo CRM, compare aux leaders du marche.
> Date : Mars 2026

---

## Legende

| Icone | Signification |
|-------|---------------|
| OK | Implemente et fonctionnel |
| PARTIEL | Implemente partiellement |
| ABSENT | Non implemente |

---

## 1. Gestion des Contacts & Leads

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Creation / Edition / Suppression | OK | OK | OK | Soft-delete avec restauration |
| Champs personnalises | OK | OK | OK | 8 types de champs (text, number, date, select, email, phone, url, checkbox) |
| Import/Export CSV | OK | OK | OK | Import CSV avec mapping de colonnes |
| Detection de doublons | OK | OK | OK | Matching par email, nom, telephone, SIRET, entreprise |
| Fusion de contacts | OK | OK | OK | Merge avec choix des valeurs a conserver |
| Lead scoring automatique | OK | OK | OK | Scoring par evenements (email, appel, deal, reunion, etc.) |
| Classification hot/warm/cold | OK | OK | OK | Seuils configurables par organisation |
| Lead routing (attribution) | OK | OK | OK | Regles conditionnelles + round-robin |
| Relations entre contacts | OK | PARTIEL | OK | 8 types de relations (manager, collegue, decision_maker, etc.) |
| Categories / Tags | OK | OK | OK | Categories avec couleurs |
| Resume IA du contact | OK | OK (beta) | OK (Einstein) | Generation via Claude API |
| Historique d'activites (timeline) | OK | OK | OK | Timeline complete avec tous les types d'evenements |
| Segmentation avancee | OK | OK | OK | Moteur de regles JSON avec preview |
| Budget estime & besoins | OK | ABSENT | OK | Champs de qualification BANT |
| Preferences (canal, langue, timezone) | OK | PARTIEL | OK | Canal prefere, fuseau horaire, langue, centres d'interet |
| Actions en masse | OK | OK | OK | Edition, suppression, tag en masse |
| Recherche globale | OK | OK | OK | Multi-mots sur contacts, entreprises, deals, taches |

**Score Qeylo : 17/17** - Couverture complete sur la gestion des contacts.

---

## 2. Gestion des Entreprises (Comptes)

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Fiche entreprise complete | OK | OK | OK | Industrie, CA, effectif, site web, SIRET, TVA |
| Hierarchie (filiales/maison-mere) | OK | PARTIEL | OK | Arborescence illimitee |
| Organigramme | OK | ABSENT | OK | Visualisation de la structure |
| Score de sante client | OK | OK | OK | excellent / good / at_risk / churned |
| Contacts rattaches | OK | OK | OK | Lien automatique contact -> entreprise |
| Deals rattaches | OK | OK | OK | Vue des deals par entreprise |
| Timeline entreprise | OK | OK | OK | Historique complet d'activites |
| Statistiques entreprise | OK | OK | OK | Vue agregee |
| Soft-delete avec cascade | OK | ABSENT | ABSENT | Suppression douce avec restauration |
| Donnees legales (SIRET, TVA) | OK | ABSENT | PARTIEL | Specifique au marche francais |

**Score Qeylo : 10/10** - Excellent, avec des fonctions specifiques au marche francais.

---

## 3. Pipeline de Vente & Deals

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Vue Kanban | OK | OK | OK | Drag & drop entre etapes |
| Pipelines multiples | OK | OK | OK | Prospection, upsell, partenariats |
| Modeles de pipeline | OK | ABSENT | OK | 3 templates preconfigures |
| Etapes personnalisables | OK | OK | OK | Couleurs, ordre, marqueur won/lost |
| Suivi des transitions | OK | PARTIEL | OK | Audit trail complet avec durees |
| Probabilite de cloture | OK | OK | OK | Pourcentage par deal |
| Date de cloture prevue | OK | OK | OK | - |
| Raisons de perte | OK | OK | OK | Bibliotheque de 7 raisons par defaut |
| Prevision de ventes (forecast) | OK | OK | OK | Calcul automatique |
| Analyse win/loss | OK | OK | OK | Taux de conversion et raisons |
| Velocite des deals | OK | PARTIEL | OK | Temps moyen par etape |
| Classement vendeurs (leaderboard) | OK | OK | OK | Ranking par performance |
| Suggestions IA d'actions | OK | OK (beta) | OK (Einstein) | Prochaines actions recommandees via Claude |
| Vue funnel | OK | OK | OK | Visualisation entonnoir |

**Score Qeylo : 14/14** - Pipeline de vente complet et mature.

---

## 4. Devis & Produits

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Catalogue produits | OK | OK | OK | Categories, prix, type d'unite |
| Creation de devis | OK | OK | OK | Depuis un deal |
| Lignes de devis | OK | OK | OK | Produit, quantite, prix unitaire |
| Calculs TVA | OK | OK | OK | Taux par ligne |
| Remises (% et fixe) | OK | OK | OK | Remise globale ou par ligne |
| Statuts de devis | OK | OK | OK | Brouillon, envoye, accepte, refuse |
| Numerotation automatique | OK | OK | OK | Format DEV-ANNEE-### |
| Duplication de devis | OK | OK | OK | Copie rapide |
| Quotas de vente mensuels | OK | OK | OK | Objectifs par vendeur/mois |
| Generation PDF | ABSENT | OK | OK | **A implementer** |
| Signature electronique | ABSENT | OK | OK | **A implementer** |
| Modeles de devis | ABSENT | OK | OK | **A implementer** |

**Score Qeylo : 9/12** - Fonctionnel mais manque la generation PDF et la signature.

---

## 5. Gestion des Taches

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Creation / Edition / Suppression | OK | OK | OK | Avec soft-delete |
| Priorites | OK | OK | OK | Haute, normale, basse |
| Lien contact / deal | OK | OK | OK | Relations multiples |
| Date d'echeance | OK | OK | OK | - |
| Taches recurrentes | OK | PARTIEL | OK | Format RRULE complet |
| Attribution multi-utilisateurs | OK | OK | OK | Assignments multiples |
| Rappels configurables | OK | OK | OK | Offsets multiples |
| Sous-taches | ABSENT | OK | OK | **A implementer** |
| Dependances entre taches | ABSENT | ABSENT | OK | Non critique |
| Vue Gantt / Timeline | ABSENT | ABSENT | OK | Non critique |

**Score Qeylo : 7/10** - Solide, manque les sous-taches.

---

## 6. Email & Communication

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Integration Gmail (OAuth2) | OK | OK | OK | Sync bidirectionnelle |
| Integration Outlook (OAuth2) | OK | OK | OK | Sync bidirectionnelle |
| Boite de reception integree | OK | OK | OK | Threads et conversations |
| Envoi d'emails depuis le CRM | OK | OK | OK | Via compte connecte |
| Templates d'email | OK | OK | OK | Variables dynamiques |
| Suivi lecture (open tracking) | PARTIEL | OK | OK | Tracking enregistre mais pas de pixel |
| Suivi de clics | ABSENT | OK | OK | **A implementer** |
| Sequences email multi-etapes | OK | OK | OK | Delais configurables |
| Detection de reponse (auto-stop) | OK | OK | OK | Arret auto si le contact repond |
| Enrollment en masse | OK | OK | OK | Inscription de contacts dans les sequences |
| Statuts d'enrollment | OK | OK | OK | active, completed, replied, bounced, opted_out, paused |
| A/B testing email | ABSENT | OK | OK | **A implementer** |
| Emails de masse (marketing) | ABSENT | OK | OK | **A implementer** - Qeylo est oriente vente, pas marketing |

**Score Qeylo : 9/13** - Bon pour le commercial, manque le volet marketing.

---

## 7. Calendrier & Reunions

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Integration Google Calendar | OK | OK | OK | OAuth2 |
| Integration Outlook Calendar | OK | OK | OK | OAuth2 |
| Creation de reunions | OK | OK | OK | Avec invites |
| Lien contacts / deals | OK | OK | OK | Association multi-contacts |
| Evenements journee entiere | OK | OK | OK | - |
| Lien de prise de RDV public | ABSENT | OK | PARTIEL | **A implementer** - Feature cle HubSpot |
| Rappels de reunion | OK | OK | OK | Configurables |
| Synchronisation bi-directionnelle | OK | OK | OK | Sync status tracking |

**Score Qeylo : 6/8** - Bon mais manque le lien de prise de RDV (tres demande).

---

## 8. Automatisation & Workflows

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Workflow builder visuel | OK | OK | OK | Nodes & edges |
| Declencheurs (triggers) | OK | OK | OK | Evenements CRM |
| Conditions (if/else) | OK | OK | OK | Evaluation dynamique |
| Actions automatiques | OK | OK | OK | Creer tache, envoyer email, deplacer deal, etc. |
| Delais dans les workflows | OK | OK | OK | Pause configurable |
| Historique d'execution | OK | OK | OK | Audit trail complet avec I/O |
| Modeles de workflows | OK | OK | OK | Templates preconfigures |
| Gestion des erreurs | OK | OK | OK | Retry logic |
| Branchement conditionnel | OK | OK | OK | Chemins multiples |
| Webhook entrant | ABSENT | OK | OK | **A implementer** |
| Webhook sortant | ABSENT | OK | OK | **A implementer** |
| Marketplace d'integrations | ABSENT | OK | OK | **A implementer a long terme** |

**Score Qeylo : 9/12** - Moteur de workflows puissant, manque les webhooks.

---

## 9. Collaboration

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Commentaires sur contacts/deals/taches | OK | OK | OK | Polymorphique |
| Commentaires prives | OK | ABSENT | OK | Visible uniquement par l'auteur |
| @mentions | OK | OK | OK | Avec notifications |
| Reactions emoji | OK | ABSENT | OK | Sur les commentaires |
| Notifications in-app | OK | OK | OK | Types multiples |
| Feed d'activite | OK | OK | OK | Timeline globale |
| Chat interne entre equipes | ABSENT | ABSENT | OK (Chatter) | Non critique |

**Score Qeylo : 6/7** - Tres bon pour un CRM de cette taille.

---

## 10. Analytics & Reporting

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Tableaux de bord personnalises | OK | OK | OK | Widgets configurables |
| Rapports agrreges | OK | OK | OK | Multi-dimensions |
| Analyse entonnoir | OK | OK | OK | Pipeline funnel |
| Prevision de ventes | OK | OK | OK | Forecast |
| Analyse win/loss | OK | OK | OK | Taux et raisons |
| Velocite des deals | OK | OK | OK | Temps par etape |
| Leaderboard equipe | OK | OK | OK | Classement vendeurs |
| Rapports planifies par email | ABSENT | OK | OK | **A implementer** |
| Export de rapports | ABSENT | OK | OK | **A implementer** |
| Rapports custom (SQL/formules) | ABSENT | PARTIEL | OK | Non critique a court terme |

**Score Qeylo : 7/10** - Bonne base analytique, manque l'export et la planification.

---

## 11. IA & Intelligence

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Resume IA des contacts | OK | OK (beta) | OK (Einstein) | Claude API |
| Suggestions d'actions | OK | PARTIEL | OK | Next actions IA |
| Chat IA integre | OK | OK (ChatSpot) | OK (Einstein Copilot) | Multi-conversations |
| Suivi d'utilisation IA | OK | ABSENT | ABSENT | Tracking tokens + couts - Unique a Qeylo |
| Generation de titres | OK | ABSENT | ABSENT | Auto-titrage des deals |
| IA predictive (churn, scoring) | ABSENT | OK | OK | **A implementer** |
| Transcription d'appels | ABSENT | OK | OK | **A implementer** |

**Score Qeylo : 5/7** - Bon usage de l'IA, avec un avantage sur le suivi des couts.

---

## 12. Administration & Securite

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Multi-tenant | OK | OK | OK | Isolation par organisation |
| Roles (owner/admin/member) | OK | OK | OK | 3 niveaux |
| Invitations par email | OK | OK | OK | Token avec expiration |
| JWT Authentication | OK | OK | OK | Access + Refresh tokens |
| Corbeille avec restauration | OK | PARTIEL | OK | Soft-delete sur contacts, deals, taches |
| Parametres par organisation | OK | OK | OK | Configurables |
| Audit trail | OK | OK | OK | Transitions, executions |
| SSO (SAML/OIDC) | ABSENT | OK | OK | **A implementer pour l'entreprise** |
| 2FA | ABSENT | OK | OK | **A implementer** |
| Permissions granulaires (ABAC) | ABSENT | OK | OK | **A implementer** - Actuellement role-based simple |
| IP whitelisting | ABSENT | ABSENT | OK | Non critique |

**Score Qeylo : 7/11** - Securise mais manque SSO et 2FA pour les grands comptes.

---

## 13. Abonnement & Facturation

| Fonctionnalite | Qeylo | HubSpot | Salesforce | Remarques Qeylo |
|----------------|-------|---------|------------|------------------|
| Plans (solo/pro/team) | OK | OK | OK | 3 plans |
| Integration Stripe | OK | N/A | N/A | Webhooks + gestion des statuts |
| Gestion des abonnements | OK | N/A | N/A | Active, past_due, canceled, unpaid |

**Score Qeylo : 3/3** - Complet pour le SaaS.

---

## Synthese Globale

| Categorie | Score Qeylo | Max | % |
|-----------|-------------|-----|---|
| Contacts & Leads | 17 | 17 | 100% |
| Entreprises | 10 | 10 | 100% |
| Pipeline & Deals | 14 | 14 | 100% |
| Devis & Produits | 9 | 12 | 75% |
| Taches | 7 | 10 | 70% |
| Email & Communication | 9 | 13 | 69% |
| Calendrier & Reunions | 6 | 8 | 75% |
| Automatisation | 9 | 12 | 75% |
| Collaboration | 6 | 7 | 86% |
| Analytics & Reporting | 7 | 10 | 70% |
| IA & Intelligence | 5 | 7 | 71% |
| Administration & Securite | 7 | 11 | 64% |
| Abonnement | 3 | 3 | 100% |
| **TOTAL** | **109** | **134** | **81%** |

---

## Top 10 - Fonctionnalites Prioritaires a Implementer

Par ordre d'impact business :

### 1. Generation PDF de devis
- **Impact** : Eleve - Les commerciaux ne peuvent pas envoyer de devis professionnels
- **Effort** : Moyen
- **Reference** : HubSpot & Salesforce l'ont en standard

### 2. Authentification 2FA
- **Impact** : Eleve - Requis pour la conformite et les grands comptes
- **Effort** : Faible
- **Reference** : Standard industrie

### 3. SSO (SAML / OIDC)
- **Impact** : Eleve - Bloquant pour les ventes entreprise (B2B)
- **Effort** : Moyen
- **Reference** : Obligatoire pour les comptes enterprise

### 4. Lien de prise de RDV public
- **Impact** : Eleve - Feature signature de HubSpot, tres demandee
- **Effort** : Moyen
- **Reference** : Calendly-like integre

### 5. Webhooks (entrants & sortants)
- **Impact** : Eleve - Prerequis pour les integrations tierces
- **Effort** : Moyen
- **Reference** : Base de tout ecosysteme d'integrations

### 6. Tracking de clics email
- **Impact** : Moyen - Donne des insights sur l'engagement
- **Effort** : Faible
- **Reference** : Standard pour les sequences de vente

### 7. Sous-taches
- **Impact** : Moyen - Meilleure decomposition du travail
- **Effort** : Faible
- **Reference** : Present chez HubSpot et Salesforce

### 8. Export de rapports (PDF/CSV)
- **Impact** : Moyen - Necessaire pour le reporting management
- **Effort** : Faible
- **Reference** : Standard industrie

### 9. Permissions granulaires (ABAC)
- **Impact** : Moyen - Important pour les equipes de +10 personnes
- **Effort** : Eleve
- **Reference** : Salesforce excelle sur ce point

### 10. A/B Testing sur les sequences email
- **Impact** : Moyen - Optimisation des campagnes commerciales
- **Effort** : Moyen
- **Reference** : Standard chez HubSpot

---

## Points Forts Uniques de Qeylo

1. **Marche francais** : SIRET, TVA intra, statut juridique - Pas chez HubSpot
2. **Suivi des couts IA** : Tracking tokens et couts par utilisateur - Unique
3. **Commentaires prives** : Pas disponible chez HubSpot
4. **Reactions emoji** : Collaboration moderne, absent chez HubSpot
5. **Soft-delete generalise** : Restauration sur toutes les entites avec corbeille centralisee
6. **Organigramme entreprise** : Absent chez HubSpot
7. **Taches recurrentes RRULE** : Format standard plus puissant que HubSpot

---

## Conclusion

Qeylo CRM atteint **81% de parite fonctionnelle** avec HubSpot et Salesforce sur les fonctionnalites essentielles d'un CRM commercial. Le coeur du produit (contacts, deals, pipeline, automatisation) est solide et complet.

Les axes d'amelioration prioritaires sont :
- **Securite** : 2FA + SSO pour debloquer le segment enterprise
- **Documents** : Generation PDF de devis pour finaliser le cycle de vente
- **Integrations** : Webhooks pour ouvrir l'ecosysteme
- **Acquisition** : Lien de prise de RDV pour generer des leads

Le produit a une base technique solide (multi-tenant, soft-delete, Celery, workflows visuels) qui permet d'ajouter ces fonctionnalites de maniere incrementale.
