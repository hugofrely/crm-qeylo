Audit complet du CRM Qeylo
Ce qui est bien en place
Gestion contacts complète (40+ champs, timeline, notes, emails, tâches, deals)
Pipeline Kanban avec drag-and-drop et multi-pipelines
Système de devis (quotes) avec lignes, taxes, remises
Workflow automation visuel (React Flow) avec triggers, conditions, actions, délais
Dashboard customisable avec widgets
Segments dynamiques avec builder de règles AND/OR
Chat IA intégré
Import/export CSV contacts
Détection de doublons configurable
Corbeille avec restauration
Multi-organisation avec rôles (Owner/Admin/Member)
Templates d'emails avec variables
Intégration Gmail/Outlook
Ce qui manque — classé par priorité
1. FILTRES & VUES MANQUANTS (Quick wins)
Page	Ce qui manque
Contacts	Pas de tri par colonnes (nom, date, lead score). Pas de vues sauvegardées. Pas de filtres avancés combinés (date + score + source). Pas de filtre par tag.
Contacts	Pas d'actions en masse (supprimer, exporter, catégoriser, assigner plusieurs contacts)
Deals	Pas de vue liste/tableau (seulement Kanban). Pas de tri par montant, probabilité, date de clôture
Deals	Pas de métriques de revenue dans le header (total pipeline, weighted forecast, deals won this month)
Tasks	Pas de filtre par type de tâche. Pas de vue workload par membre d'équipe
Products	Pas d'import/export. Pas de bulk update de prix. Pas d'images produit
Reports	Pas d'export PDF/Excel. Pas de planification d'envoi par email
Segments	Pas de preview des contacts matchés avant de sauvegarder
2. INFORMATIONS MANQUANTES SUR LES FICHES
Entité	Données manquantes
Contact detail	Pas de score de complétude du profil. Pas de dernière interaction affichée. Pas de contacts liés/relations. Pas d'historique de communication unifié
Deal detail	Pas de timeline/activités sur le deal. Pas de tâches liées visibles. Pas de raison de perte quand deal perdu. Pas de contacts multiples (comité d'achat)
Deal cards (Kanban)	Pas d'indicateur d'activité récente. Pas de temps passé dans le stage. Pas de next step affiché
Task detail	Pas de sous-tâches/checklist. Pas de pièces jointes. Pas de commentaires internes
3. FONCTIONNALITÉS MANQUANTES IMPORTANTES
Gestion Comptes/Entreprises (Critique pour B2B)
Pas de module Comptes/Entreprises séparé — Les contacts ont un champ "company" mais il n'y a pas de fiche entreprise dédiée avec hiérarchie, contacts liés, deals liés, CA total
Pas de vue organigramme des contacts d'une entreprise
Pipeline & Ventes
Pas de forecasting — Pas de prévision de revenus pondérée par probabilité
Pas d'analyse win/loss — Pas de raisons de perte structurées
Pas de deal velocity — Temps moyen par stage, cycle de vente moyen
Pas de quotas — Pas d'objectifs par commercial
Pas de leaderboard — Pas de classement d'équipe
Pas de next best action — Suggestions IA de prochaines étapes
Communication
Pas de boîte de réception unifiée — Les emails envoyés/reçus ne sont pas centralisés
Pas d'intégration calendrier — Pas de sync Google Calendar / Outlook Calendar
Pas de log d'appels — Pas de suivi des appels téléphoniques avec durée
Pas de SMS — Pas d'intégration Twilio ou similaire
Pas de séquences email — Pas d'envoi automatisé d'emails en séquence (nurturing)
Collaboration
Pas de @mentions sur les contacts/deals/tâches
Pas de commentaires internes sur les fiches
Pas de notifications en temps réel (WebSocket)
Pas de partage de notes entre membres
Automatisation
Pas de lead scoring automatique basé sur les activités
Pas de lead routing — Pas d'assignation automatique des leads
Pas de tâches récurrentes (le modèle a recurrence_rule mais pas visible dans l'UI)
Pas de séquences de vente (cadences)
4. PERSONNALISATION MANQUANTE
Élément	Ce qui manque
Colonnes de tableaux	Pas de sélection/réorganisation des colonnes affichées
Vues sauvegardées	Impossible de sauvegarder des combinaisons de filtres
Layouts personnalisés	Les fiches contact/deal ont un layout fixe, pas de drag-and-drop des sections
Champs conditionnels	Les custom fields existent mais pas de visibilité conditionnelle
Raccourcis clavier	Aucun raccourci pour power users
Dashboard par défaut	Pas de templates de dashboard prêts à l'emploi
5. REPORTING & ANALYTICS
Pas de rapports pré-construits exploitables immédiatement (pipeline velocity, win rate, activité par rep, sources de leads)
Pas de comparaison temporelle (ce mois vs mois dernier, YoY)
Pas de drill-down — Cliquer sur un graphique ne montre pas les données sous-jacentes
Pas d'alertes/seuils — Pas de notification quand un KPI dépasse un seuil
Pas d'attribution — Pas de suivi de la source qui a mené au deal gagné
6. SÉCURITÉ & CONFORMITÉ
Pas de 2FA — Authentification JWT simple uniquement
Pas de permissions par champ — Seulement 3 rôles globaux (Owner/Admin/Member)
Pas d'audit trail complet — Pas de log de qui a vu/modifié quoi
Pas de tracking RGPD — Pas de gestion du consentement
Pas de SSO/SAML pour les entreprises
7. INTÉGRATIONS MANQUANTES
Calendrier (Google Calendar, Outlook Calendar)
Slack / Teams (notifications)
Zapier / Make (connexions externes)
Téléphonie (Aircall, Ringover)
Signature électronique (DocuSign, Yousign)
Comptabilité (Pennylane, QuickBooks)
Enrichissement de données (Clearbit, Dropcontact)
Top 10 des actions prioritaires
Ajouter un module Comptes/Entreprises avec contacts et deals liés
Ajouter le tri et les vues sauvegardées sur les pages contacts et deals
Ajouter les actions en masse (sélection multiple + actions groupées)
Ajouter une vue liste pour les deals en complément du Kanban
Ajouter le forecasting (revenus pondérés, pipeline health)
Enrichir les fiches deals (timeline, tâches liées, raison de perte, multi-contacts)
Intégrer le calendrier (Google/Outlook) pour les rendez-vous
Activer les tâches récurrentes dans l'UI (le backend semble prêt)
Ajouter les @mentions et commentaires sur contacts/deals
Créer des rapports pré-construits avec drill-down