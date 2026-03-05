# Prompts de test — Chat IA Qeylo

Document de test pour valider toutes les actions du chat IA.
Les 9 outils disponibles : **create_contact**, **search_contacts**, **create_deal**, **move_deal**, **create_task**, **complete_task**, **add_note**, **get_dashboard_summary**, **search_all**.

---

## 1. Création de contacts

### Simples

```
Ajoute un contact : Marie Dupont
```

```
Crée un contact Jean Martin, email jean@example.com
```

```
Nouveau contact : Sophie Bernard, téléphone 06 12 34 56 78
```

### Avec entreprise

```
Ajoute Pierre Leroy de chez Decathlon, pierre@decathlon.com
```

```
Crée un contact : Camille Moreau, entreprise Nike, email camille.moreau@nike.com, téléphone 01 23 45 67 89
```

### Phrase naturelle complexe

```
J'ai rencontré Alexandre Petit au salon. Il travaille chez Airbus, son mail c'est a.petit@airbus.com
```

```
Peux-tu ajouter mon nouveau prospect ? C'est Nadia Hamidi, elle est directrice chez BNP Paribas. Son numéro c'est 07 98 76 54 32 et son email nadia.hamidi@bnp.fr
```

### Cas limites

```
Ajoute un contact sans nom
```

```
Crée le contact Emma
```

```
Contact : 06 12 34 56 78, test@mail.com
```

---

## 2. Recherche de contacts

### Simple

```
Cherche Marie
```

```
Trouve les contacts chez Decathlon
```

```
Est-ce que j'ai un contact nommé Dupont ?
```

### Par email/entreprise

```
Recherche le contact avec l'email jean@example.com
```

```
Quels contacts sont chez Nike ?
```

### Aucun résultat attendu

```
Cherche un contact nommé Zzzxyqw
```

---

## 3. Création de deals

### Simple

```
Crée un deal "Site web Decathlon" à 5000€
```

```
Nouveau deal pour Nike, montant 12000€
```

### Avec contact lié

```
Crée un deal "Refonte logo" à 3000€ pour Marie Dupont
```

```
Ajoute un deal de 8000€ avec Pierre Leroy pour le projet "Formation équipe"
```

### Avec étape spécifique

```
Crée un deal "Audit SEO" à 2500€ en étape "Devis envoyé"
```

```
Nouveau deal "Contrat annuel" à 50000€, étape Négociation
```

### Phrase naturelle

```
Marie Dupont veut un devis pour un site e-commerce à 15000€
```

```
J'ai un nouveau projet avec Nike : refonte de leur app mobile, budget estimé 40000€
```

### Sans montant

```
Crée un deal "Appel découverte" pour Sophie Bernard
```

---

## 4. Déplacement de deals

### Simple

```
Passe le deal "Site web Decathlon" en "Devis envoyé"
```

```
Déplace le deal Nike en Négociation
```

### Gagner / Perdre

```
Le deal "Refonte logo" est gagné
```

```
On a perdu le deal "Audit SEO"
```

### Phrase naturelle

```
Marie Dupont a accepté le devis pour le site e-commerce, c'est gagné !
```

```
Le projet Formation équipe ne se fera pas finalement
```

### Cas limites

```
Déplace le deal "Deal inexistant" en Négociation
```

```
Passe le deal Nike en étape "Étape qui n'existe pas"
```

---

## 5. Création de tâches

### Simple

```
Crée une tâche : Appeler Marie Dupont demain
```

```
Rappelle-moi de relancer Nike le 15 mars
```

### Avec priorité

```
Tâche urgente : Envoyer le devis à Pierre Leroy avant vendredi
```

```
Crée une tâche priorité haute : préparer la présentation pour lundi
```

```
Tâche basse priorité : mettre à jour le CRM
```

### Liée à un contact

```
Ajoute une tâche pour Marie Dupont : envoyer le contrat avant le 20 mars
```

### Liée à un deal

```
Crée un rappel pour le deal "Site web Decathlon" : relancer le client le 10 mars
```

### Phrases naturelles

```
Il faut que je rappelle Camille Moreau la semaine prochaine pour finaliser le contrat
```

```
N'oublie pas : réunion avec l'équipe Nike le 25 mars à 14h
```

```
Ajoute un rappel pour dans 3 jours : envoyer la facture à BNP
```

### Cas limites

```
Crée une tâche sans date
```

```
Tâche : faire le suivi
```

---

## 6. Complétion de tâches

### Simple

```
La tâche "Appeler Marie Dupont" est faite
```

```
Marque la relance Nike comme terminée
```

### Phrase naturelle

```
J'ai appelé Marie, c'est bon
```

```
C'est fait pour l'envoi du devis à Pierre
```

---

## 7. Ajout de notes

### Sur un contact

```
Ajoute une note pour Marie Dupont : Intéressée par notre offre premium, rappeler en mars
```

```
Note sur Pierre Leroy : A mentionné un budget de 10k pour Q2
```

### Sur un deal

```
Ajoute une note sur le deal Nike : Le client souhaite une démo avant de signer
```

```
Note pour le deal "Site web Decathlon" : Réunion planifiée le 12 mars
```

### Note libre

```
Note : Salon professionnel le 20 mars, bonne occasion de prospection
```

### Phrase naturelle

```
Marie m'a dit qu'elle partait en vacances jusqu'au 1er avril, ne pas la relancer avant
```

```
Le budget de Nike est revu à la hausse, ils peuvent aller jusqu'à 60k
```

---

## 8. Dashboard / Résumé

### Demande directe

```
Montre-moi le dashboard
```

```
Quel est le résumé de mon activité ?
```

```
Combien de deals actifs j'ai ?
```

### Questions spécifiques

```
Quel est le montant total de mon pipeline ?
```

```
Combien de tâches en retard ?
```

```
Combien de contacts j'ai au total ?
```

### Phrases naturelles

```
Comment ça se passe côté business ?
```

```
Fais-moi un point sur mes chiffres
```

```
Où j'en suis dans mon pipeline ?
```

---

## 9. Recherche globale

### Simple

```
Cherche "Decathlon" partout
```

```
Recherche tout ce qui concerne Nike
```

### Phrase naturelle

```
Qu'est-ce que j'ai sur Marie Dupont ?
```

```
Montre-moi tout ce qui est lié à BNP
```

---

## 10. Scénarios multi-actions

Ces prompts devraient déclencher plusieurs outils en séquence.

### Création contact + deal

```
J'ai un nouveau prospect : Lucas Martin de chez Adidas, lucas@adidas.com. Il veut un site web à 8000€.
```

```
Ajoute Fatima Benali, fatima@tesla.com, chez Tesla. Crée aussi un deal "Consulting RH" à 15000€ pour elle.
```

### Création contact + tâche

```
Nouveau contact : Thomas Durand, thomas@gmail.com. N'oublie pas de le rappeler vendredi.
```

### Deal + note + tâche

```
Le deal Nike est passé en Négociation. Note : ils veulent une réduction de 10%. Il faut que je prépare une contre-offre pour lundi.
```

### Scénario complet

```
J'ai rencontré Julie Garnier au networking hier soir. Elle est CEO de GreenTech, son email c'est julie@greentech.io. Elle cherche un CRM sur mesure, budget autour de 25000€. Il faut que je lui envoie une proposition avant le 20 mars. Note : elle préfère être contactée par email.
```

```
Crée un contact Anna Schmidt de chez BMW, anna@bmw.de. Ajoute un deal "Partenariat BMW" à 100000€ en étape "En discussion". Note : premier RDV très positif, décideur identifié. Tâche : préparer le dossier technique pour le 1er avril, priorité haute.
```

---

## 11. Conversations contextuelles

Ces prompts testent la capacité du chat à comprendre le contexte de la conversation.

### Suivi de conversation

```
— Prompt 1 : Ajoute Marie Dupont, marie@example.com
— Prompt 2 : Crée un deal de 5000€ pour elle
— Prompt 3 : Ajoute une note : intéressée par l'offre pro
— Prompt 4 : Rappelle-moi de la relancer dans une semaine
```

### Références implicites

```
— Prompt 1 : Cherche les contacts chez Decathlon
— Prompt 2 : Crée un deal de 3000€ avec le premier
```

```
— Prompt 1 : Quels sont mes deals actifs ?
— Prompt 2 : Passe le plus gros en Négociation
```

---

## 12. Cas limites et erreurs

### Prompts ambigus

```
Ajoute un truc
```

```
Fais le suivi
```

```
Mets à jour
```

### Prompts hors scope

```
Quel temps fait-il à Paris ?
```

```
Raconte-moi une blague
```

```
Écris-moi un email pour Marie Dupont
```

### Données invalides

```
Crée un deal à -5000€
```

```
Ajoute une tâche pour le 31 février
```

```
Déplace le deal en étape ""
```

### Demandes de suppression (non supporté)

```
Supprime le contact Marie Dupont
```

```
Efface le deal Nike
```

```
Annule la dernière tâche
```

---

## 13. Prompts en anglais

Le système doit répondre dans la langue de l'utilisateur.

```
Add a contact: John Smith, john@example.com, works at Google
```

```
Create a deal "Website redesign" for $10,000
```

```
Show me my dashboard
```

```
Search for everything related to Nike
```

```
I met Sarah Johnson at a conference. She's the CTO of SpaceX. Create a contact and a deal for a consulting project worth $50k.
```

---

## Checklist de validation

| # | Outil | Prompt simple | Prompt complexe | Multi-action | Erreur |
|---|-------|:---:|:---:|:---:|:---:|
| 1 | create_contact | ☐ | ☐ | ☐ | ☐ |
| 2 | search_contacts | ☐ | ☐ | — | ☐ |
| 3 | create_deal | ☐ | ☐ | ☐ | ☐ |
| 4 | move_deal | ☐ | ☐ | ☐ | ☐ |
| 5 | create_task | ☐ | ☐ | ☐ | ☐ |
| 6 | complete_task | ☐ | ☐ | — | ☐ |
| 7 | add_note | ☐ | ☐ | ☐ | — |
| 8 | get_dashboard_summary | ☐ | ☐ | — | — |
| 9 | search_all | ☐ | ☐ | — | ☐ |
