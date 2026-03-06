# Chat AI - Suggestions d'utilisation

## Objectif
Ajouter des suggestions d'utilisation en langage naturel sur l'écran d'accueil du chat IA, organisées en accordéon progressif (simple → intermédiaire → avancé).

## Emplacement
Sous le message de bienvenue existant ("Bonjour [prénom]"), centré, max-w-3xl.

## Comportement
- 5 suggestions simples visibles directement
- Bouton "Voir plus" révèle 4 suggestions intermédiaires
- Second bouton "Voir plus" révèle 4 suggestions avancées
- Clic sur une suggestion → envoie automatiquement le message
- Les suggestions disparaissent dès qu'une conversation a des messages
- Animations : fade-in échelonné, hover avec légère élévation

## Suggestions

### Simples (visibles)
- "Crée un contact pour Marie Dupont de chez Acme"
- "Ajoute un deal de 5000€ pour le projet refonte site"
- "Montre-moi mes tâches de la semaine"
- "Envoie un email de suivi à Jean Martin"
- "Combien de deals ai-je en cours ?"

### Intermédiaires (1er "Voir plus")
- "Crée un contact pour Sophie Blanc et ajoute-lui un deal de 12000€"
- "Modifie le téléphone de Marie Dupont en 06 12 34 56 78"
- "Ajoute une note de suivi au deal Refonte Site : réunion prévue vendredi"
- "Déplace le deal Acme en phase de négociation"

### Avancées (2ème "Voir plus")
- "Crée un contact pour Pierre Noir chez TechCorp, ajoute un deal de 25000€ et planifie un appel pour demain"
- "Montre-moi tous les contacts sans activité depuis 30 jours"
- "Donne-moi un résumé de mon pipeline avec un graphique par étape"
- "Quels deals de plus de 10000€ sont bloqués depuis plus de 2 semaines ?"

## Composant
Nouveau fichier : `frontend/components/chat/ChatSuggestions.tsx`
Intégré dans `ChatWindow.tsx` sous le bloc de bienvenue.

## Style
- Chips avec bordure subtile, fond léger, coins arrondis
- Icône contextuelle par suggestion (UserPlus, Handshake, CheckSquare, Mail, BarChart3)
- Cohérent avec shadcn/ui + Tailwind existant
