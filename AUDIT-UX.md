# Audit UX - Qeylo CRM

Date : 7 mars 2026
Testeur : Claude (automatise avec Playwright)
Resolutions testees : Desktop (1440x900) et Mobile (390x844)

---

## 1. PROBLEMES CRITIQUES

### 1.1 Sidebar trop longue - 11 items de navigation
La sidebar contient 11 liens de navigation + Parametres + profil utilisateur. C'est beaucoup trop pour un CRM. Cela provoque :
- Un scroll necessaire en desktop pour voir tous les items si la fenetre est petite
- En mobile, le menu hamburger affiche une longue liste sans hierarchie claire
- **Suggestion** : Regrouper les items par categorie (ex: "Pipeline" et "Entonnoir" ensemble, "Dashboard" et "Rapports" ensemble). Envisager un systeme de sous-menus ou de sections repliables.

### 1.2 Page Pipeline (Desktop) - Zone de filtres trop volumineuse
La zone de filtres du pipeline prend **2 lignes completes** en haut de page (recherche deal, contact, montant min/max, date closing, date creation, cree par). Elle occupe environ 150px de hauteur, soit ~17% de l'ecran visible.
- Les filtres sont rarement tous utilises en meme temps
- **Suggestion** : Cacher les filtres par defaut derriere un bouton "Filtres" (comme c'est deja fait en mobile). Afficher uniquement la barre de recherche principale et un bouton filtre.

### 1.3 Page Taches (Desktop) - Zone de filtres encore plus volumineuse
Meme probleme que le pipeline mais en pire : les filtres occupent **2 lignes** avec priorite, echeance, contact, assigne + champ de recherche membre. Cela prend ~180px.
- La zone "Assigne" avec "Mes taches" + un champ de recherche membre est sur une 2e ligne, ce qui gaspille de l'espace
- **Suggestion** : Meme approche, masquer derriere un bouton "Filtres" par defaut, ou les placer sur une seule ligne avec des dropdowns compacts.

### 1.4 Tache "est" sans contenu
Dans la liste des taches, il y a une tache avec simplement "est" comme titre. C'est soit un bug de donnees, soit un manque de validation a la creation. A verifier.

---

## 2. PROBLEMES D'ESPACEMENT ET DE GAIN DE PLACE

### 2.1 Page Contacts - Espace entre header et tableau
Il y a un espace notable (~30px) entre le header "Contacts / 200 contacts au total" et la barre de filtres, puis entre les filtres et le tableau. La zone de filtres (recherche + categories) est dans un conteneur avec padding genereux.
- **Suggestion** : Reduire le padding vertical du conteneur de filtres. Integrer la recherche directement dans le header a cote des boutons d'action.

### 2.2 Page Contacts - Lignes de tableau tres hautes
Chaque ligne de contact occupe beaucoup de hauteur verticale en raison de :
- Le nom + lead score sur une ligne
- Le titre sur une 2e ligne
- Les tags sur une 3e ligne
Resultat : seulement 7 contacts visibles a l'ecran en desktop (1440x900).
- **Suggestion** : Rendre les tags inline avec le titre, ou les afficher au survol. Reduire le padding vertical des lignes. Objectif : 10-12 contacts visibles a l'ecran.

### 2.3 Page Segments - Enorme espace vide
La page Segments n'a que 4 items et laisse un enorme espace blanc en dessous. Pas de probleme fonctionnel, mais la page parait "vide".
- **Suggestion** : Ajouter une section "Segments suggeres" ou des KPIs de segments pour combler l'espace et apporter de la valeur.

### 2.4 Page Workflows - Meme probleme d'espace vide
Un seul workflow, page quasi vide.
- **Suggestion** : Afficher les templates de workflows directement sur la page quand il y a peu de workflows, au lieu de les cacher derriere un bouton.

### 2.5 Page Rapports - Cards trop espacees
Les 3 cards de rapports sont dans un conteneur avec beaucoup de marge. L'espace sous les cards est completement vide.
- **Suggestion** : Afficher un apercu/miniature des rapports dans les cards. Ajouter une section "Rapports recents" ou "Rapports favoris".

### 2.6 Page Corbeille - Header sans padding
Le titre "Corbeille" est colle au bord gauche sans le meme padding que les autres pages. Inconsistance de layout.

---

## 3. PROBLEMES UX DESKTOP

### 3.1 Pipeline - Symbole "$" devant les montants en euros
Les cards du pipeline affichent "$ 200 000 EUR" alors que les montants sont en euros. Le symbole dollar est incoherent avec la devise EUR.
- **Suggestion** : Afficher simplement "200 000 EUR" ou "200 000 $" selon la devise.

### 3.2 Pipeline - Colonnes coupees a droite
La derniere colonne du kanban (Negociation) est coupee sur la droite. L'utilisateur doit scroller horizontalement pour voir tous les deals.
- **Suggestion** : Ajouter un indicateur visuel qu'il y a plus de contenu a droite (fleche ou fade).

### 3.3 Contacts - Pas de selection multiple
Pas de checkbox pour selectionner plusieurs contacts et faire des actions groupees (suppression, ajout de tag, export selection).
- **Suggestion** : Ajouter des checkboxes a gauche de chaque ligne comme c'est fait pour les taches.

### 3.4 Contact Detail - Layout 2 colonnes mal equilibre
La fiche contact est en 2 colonnes : infos a gauche, onglets activites a droite. La colonne de gauche est tres longue (infos + resume IA) tandis que les activites a droite sont peu nombreuses. Desequilibre visuel.
- **Suggestion** : Placer le resume IA dans un onglet dedie plutot que dans la sidebar.

### 3.5 Entonnoir - Tableau en doublon avec le graphique
L'entonnoir affiche un graphique visuel ET un tableau avec exactement les memes donnees en dessous. Redondance.
- **Suggestion** : Rendre le tableau togglable ou l'integrer comme tooltip au survol des etapes du graphique.

### 3.6 Barre de recherche globale - Raccourci Cmd+K coupe
Le badge "Cmd+K" dans la barre de recherche est affiche avec les symboles dans des petites boxes qui prennent de l'espace inutile dans la barre de recherche.

---

## 4. PROBLEMES UX MOBILE

### 4.1 Chat - Pas d'acces a l'historique des conversations
En mobile, le panneau lateral "Conversations" n'est pas visible et il n'y a pas de bouton pour y acceder. L'utilisateur ne peut voir que la conversation en cours.
- **Suggestion** : Ajouter un bouton pour afficher l'historique des conversations en mobile (drawer ou page dediee).

### 4.2 Contacts Mobile - Tableau trop serre
Le tableau en mobile ne montre que 2 colonnes (Nom, Entreprise). Les emails, telephones et dates ne sont pas accessibles sans cliquer sur le contact.
- **Suggestion** : Afficher les contacts en mode "cards" plutot qu'en tableau sur mobile. Chaque card pourrait montrer nom, entreprise, email et un bouton d'action rapide (appel/email).

### 4.3 Contact Detail Mobile - Onglets coupes
Les onglets (Activites, Notes, Emails, Taches, Deals, Historique) ne montrent que l'icone sans le texte pour les derniers onglets en mobile. L'utilisateur ne sait pas a quoi correspondent les icones.
- **Suggestion** : Utiliser un scroll horizontal sur les onglets avec le texte visible, ou un menu dropdown.

### 4.4 Taches Mobile - Texte tronque
Les titres de taches longues sont coupes sans ellipsis ("Preparer proposition commerciale pour RoboTec..."). L'utilisateur ne peut pas distinguer les taches similaires.
- **Suggestion** : Permettre le retour a la ligne ou afficher un tooltip au clic long.

### 4.5 Taches Mobile - Colonnes masquees
En mobile, seules la checkbox, le titre et la priorite sont affichees. L'echeance, le contact associe et l'assigne disparaissent. L'echeance est pourtant une info critique pour les taches.
- **Suggestion** : Afficher l'echeance sous le titre en petit texte gris plutot que de la masquer completement.

### 4.6 Dashboard Mobile - Graphiques probablement illisibles
Les graphiques du dashboard sur 390px de large risquent d'etre tres comprimes et difficiles a lire.
- **Suggestion** : Empiler les graphiques verticalement en pleine largeur. Permettre le zoom/tap sur un graphique pour le voir en plein ecran.

### 4.7 Bouton Intercom/Support en bas a gauche
Le bouton "N" en bas a gauche chevauche le contenu en mobile, notamment sur la page contacts ou il cache le dernier contact.
- **Suggestion** : Deplacer le bouton ou le rendre dismissable en mobile.

---

## 5. COHERENCE ET DETAILS

### 5.1 Accents manquants dans les headers
Certains titres n'ont pas d'accents : "Cree le", "Coordonnees", "Resume IA", "Activites", etc. alors que d'autres en ont ("Parametres", "Gerez vos deals").
- **Suggestion** : Uniformiser - soit tout avec accents, soit utiliser une police qui les supporte bien.

### 5.2 Mix de langues
Certains labels sont en anglais ("Lead score: hot/warm/cold", "Account Manager", "VP Engineering", "COO") tandis que le reste de l'interface est en francais.
- Les titres de postes sont probablement des donnees, pas un probleme d'interface
- Mais "Lead score" pourrait etre traduit en "Score" ou "Temperature"

### 5.3 Page Produits - Reference vide
Le produit "Test" a un tiret "-" comme reference. La colonne Reference ne semble pas obligatoire.
- **Suggestion** : Masquer la colonne Reference si aucun produit n'en a, ou la rendre obligatoire.

### 5.4 Pagination - Style inconsistant
La pagination est presente sur Contacts (10 pages) et Taches (3 pages) mais pas sur les autres listes. Le style est correct mais pourrait etre plus compact.

### 5.5 Pipeline - Warning React dans la console
"Tabs is changing from uncontrolled to controlled" - Bug technique a corriger (probablement un state initial undefined).

---

## 6. FONCTIONNALITES MANQUANTES POUR UN CRM

### 6.1 Pas de vue "Activites du jour" globale
Le dashboard n'a pas de widget dedié aux activites recentes toutes entites confondues (derniers contacts modifies, deals mis a jour, taches completees).

### 6.2 Pas de raccourci de creation rapide
Pas de bouton "+" global pour creer rapidement un contact, un deal ou une tache depuis n'importe quelle page.

### 6.3 Pas de drag & drop dans le pipeline
Les cards du pipeline ne semblent pas etre deplacables par glisser-deposer entre les colonnes (a verifier - non testable en accessibilite snapshot).

### 6.4 Pas de fil d'activite unifie
L'historique est disponible par contact mais pas de vue "timeline" globale de toute l'activite CRM.

### 6.5 Pas d'indicateur de taches en retard visible
Les taches passees (2 mars, 3 mars) sont en rouge dans la colonne echeance mais il n'y a pas de badge/compteur de taches en retard dans la sidebar ou le header.

---

## 7. COULEURS, CONTRASTES ET BACKGROUNDS

### 7.1 Palette actuelle extraite

| Element | Couleur | Valeur |
|---------|---------|--------|
| Sidebar fond | Teal tres fonce | `rgb(13, 31, 31)` ~ `#0D1F1F` |
| Sidebar texte | Beige clair | `rgb(232, 229, 223)` ~ `#E8E5DF` |
| Sidebar lien inactif | Beige a 60% opacite | `rgba(232, 229, 223, 0.6)` |
| Body / main content | Beige off-white | `rgb(250, 250, 247)` ~ `#FAFAF7` |
| Texte principal (h1, noms) | Quasi-noir chaud | `rgb(26, 26, 23)` ~ `#1A1A17` |
| Texte secondaire (sous-titres, dates) | Gris moyen | `rgb(100, 99, 94)` ~ `#64635E` |
| Bordures | Beige gris | `rgb(229, 226, 220)` ~ `#E5E2DC` |
| Bouton primaire (Ajouter, Nouveau) | Teal fonce | `rgb(13, 79, 79)` ~ `#0D4F4F` |
| Bouton primaire texte | Off-white | `rgb(245, 245, 240)` ~ `#F5F5F0` |
| Bouton secondaire fond | Meme que body | `rgb(250, 250, 247)` |
| Bouton secondaire bordure | Bordure standard | `1px solid rgb(229, 226, 220)` |
| Cards (pipeline, rapports) | Blanc | `rgb(255, 255, 255)` ~ `#FFFFFF` |
| Avatar initiales fond | Teal a 10% opacite | `rgba(13, 79, 79, 0.1)` |
| Avatar initiales texte | Teal | `rgb(13, 79, 79)` |
| Filtre container fond | Beige a 50% opacite | `rgba(240, 237, 232, 0.5)` |
| Filtre container bordure | Beige a 40% opacite | `rgba(229, 226, 220, 0.4)` |

### 7.2 Badges de priorite (Taches)

| Priorite | Fond | Texte | Ratio estime |
|----------|------|-------|-------------|
| Haute | Rose pale `~#EEDBD8` | Rouge fonce `~#C02020` | OK (~5:1) |
| Normale | Bleu pale `~#DDE0EE` | Bleu fonce `~#2030A0` | OK (~5:1) |
| Basse | Gris pale `~#F0EEF0` | Gris fonce `~#444050` | OK (~6:1) |

### 7.3 Lead score (points colores sur contacts)

Les points de couleur (hot = rose/rouge, warm = orange, cold = bleu) sont de **tres petits cercles** (~8px). Ils sont le seul indicateur visuel du lead score dans la liste. Difficile a distinguer pour les daltoniens.
- **Suggestion** : Ajouter un texte court a cote du point ("Chaud", "Tiede", "Froid") ou utiliser des icones distinctes (flamme, tiede, flocon).

### 7.4 Problemes de contraste identifies

**7.4.1 Sidebar - Liens inactifs a 60% opacite**
Les liens non-actifs dans la sidebar sont en `rgba(beige, 0.6)` sur fond `#0D1F1F`. Cela donne un ratio d'environ **4.5:1** qui est juste a la limite WCAG AA. Le texte est de petite taille (14px), ce qui exigerait normalement 4.5:1 minimum.
- **Suggestion** : Monter a 80% d'opacite (`rgba(232, 229, 223, 0.8)`) pour un ratio plus confortable (~7:1). La distinction actif/inactif serait maintenue par le fond colore de l'item actif.

**7.4.2 Sous-titres et texte secondaire**
Le gris `rgb(100, 99, 94)` sur le fond `rgb(250, 250, 247)` donne un ratio d'environ **3.8:1**. C'est **en dessous du minimum WCAG AA** de 4.5:1 pour du texte de petite taille.
- Elements concernes : "200 contacts au total", "Product Manager", dates de creation, timestamps des activites, descriptions de segments
- **Suggestion** : Assombrir le texte secondaire a `rgb(80, 79, 74)` (~`#504F4A`) pour atteindre un ratio ~5.2:1 tout en gardant la hierarchie visuelle.

**7.4.3 Onglets inactifs de la fiche contact**
Les onglets non-selectionnes (Notes, Emails, Taches, Deals, Historique) sont a 60% d'opacite du texte fonce. Ratio estime ~3.5:1. Insuffisant pour un element interactif.
- **Suggestion** : Utiliser `rgb(100, 99, 94)` comme couleur d'onglet inactif (pas d'opacite) et `rgb(26, 26, 23)` + un underline teal pour l'onglet actif.

**7.4.4 Filter pills (boutons Haute, Normale, En retard, etc.)**
Les boutons de filtre non-actifs ont un texte `rgb(100, 99, 94)` sur fond `rgb(250, 250, 247)` avec bordure `rgb(229, 226, 220)`. Le texte est lisible mais a la limite. La bordure est tres subtile.
- **Suggestion** : Garder le style actuel mais renforcer la bordure a `rgb(200, 197, 191)` pour mieux delimiter les pills. Quand un filtre est actif, utiliser un fond teal `#0D4F4F` avec texte blanc comme le bouton primaire.

**7.4.5 Dates en retard (rouge sur blanc)**
Les dates echeues dans les taches apparaissent en rouge. Le rouge utilise semble etre un rouge vif qui a un bon contraste, c'est un bon pattern. Cependant, la couleur rouge seule ne suffit pas pour l'accessibilite (daltonisme).
- **Suggestion** : Ajouter une icone d'alerte ou un fond rouge pale en plus du texte rouge.

### 7.5 Backgrounds - Ou en ajouter, ou en retirer

**7.5.1 Tableaux - Pas de fond d'en-tete**
Les headers de tableau (NOM, ENTREPRISE, EMAIL...) n'ont aucun fond distinct. Ils sont en gris `rgb(100, 99, 94)` sur fond transparent (donc le body beige). Cela rend la separation entre les filtres et les donnees peu claire.
- **Suggestion** : Ajouter un fond `rgb(240, 237, 232)` (~`#F0EDE8`) aux en-tetes de tableau. Cela creerait une barre visuelle qui separe les filtres du contenu et ancrerait le header en tant que repere.

**7.5.2 Fiche contact - Sections sans separation**
Les sections (Categories, Coordonnees, Qualification, Profil, Resume IA) n'ont aucun fond ni bordure. Elles sont separees uniquement par du padding et un titre h3 en gras. Sur un ecran large, ces sections se fondent les unes dans les autres.
- **Suggestion** : Ajouter un fond blanc `#FFFFFF` avec un `border-radius: 12px` et un leger `border: 1px solid #E5E2DC` a chaque section. Cela creera des "cards" visuelles comme les cards du pipeline. L'onglet actif (Activites) dans la colonne de droite devrait aussi avoir un fond blanc distinct.

**7.5.3 Zone de filtres (Pipeline, Taches, Contacts)**
Actuellement, la zone de filtres a un fond beige semi-transparent avec bordure subtile (`border-radius: 12px`). C'est bien, mais le fond est trop similaire au body.
- **Suggestion** : Utiliser un fond blanc `#FFFFFF` au lieu du beige semi-transparent pour la zone de filtres. Cela la distinguera mieux du fond de page et sera coherent avec les cards du pipeline.

**7.5.4 Page Rapports - Cards sans contenu visuel**
Les cards de rapports ont un fond blanc avec bordure, c'est bien. Mais elles sont presque vides (titre + date).
- **Suggestion** : Ajouter un apercu miniature du rapport en fond de card (meme flou/desature) pour donner un contexte visuel.

**7.5.5 Pipeline - Cards OK**
Les cards du pipeline sont en fond blanc `#FFFFFF` sur fond beige `#FAFAF7`. Le contraste est bon et la hierarchie visuelle est claire. A conserver.

**7.5.6 Corbeille - Message d'alerte**
Le bandeau jaune "Les elements sont supprimes definitivement apres 30 jours" a un fond beige/jaune pale. C'est correct et visible.

**7.5.7 Tableau des activites (fiche contact)**
Les items d'activite (Email recu, Appel, Reunion) n'ont pas de fond. Ils sont separes par du padding seul. Sur fond beige, ils se confondent.
- **Suggestion** : Ajouter un fond blanc `#FFFFFF` a chaque item d'activite avec un `border-radius: 8px` et un espacement de 8px entre eux. Ou utiliser un trait vertical de timeline avec des cercles colores par type d'activite (teal pour email, orange pour appel, violet pour reunion).

### 7.6 Palette de couleurs recommandee

Basee sur la charte existante (teal/beige), voici les ajustements recommandes :

```
/* Couleurs existantes a conserver */
--sidebar-bg: #0D1F1F;              /* OK */
--primary: #0D4F4F;                 /* OK - Teal */
--primary-text: #F5F5F0;            /* OK */
--body-bg: #FAFAF7;                 /* OK - Off-white chaud */
--text-primary: #1A1A17;            /* OK */
--border: #E5E2DC;                  /* OK */

/* Couleurs a ajuster */
--text-secondary: #504F4A;          /* Etait #64635E - trop clair */
--sidebar-link-inactive: rgba(232, 229, 223, 0.8);  /* Etait 0.6 */
--tab-inactive: #504F4A;            /* Plus d'opacite, couleur directe */

/* Couleurs a ajouter */
--card-bg: #FFFFFF;                 /* Pour sections, filtres, activites */
--table-header-bg: #F0EDE8;         /* Pour en-tetes de tableaux */
--filter-active-bg: #0D4F4F;        /* Filtre actif = teal plein */
--filter-active-text: #F5F5F0;      /* Texte blanc sur filtre actif */
--border-strong: #C8C5BF;           /* Bordure renforcee pour pills */

/* Statuts - conserver les existants */
--priority-high-bg: #EEDBD8;
--priority-high-text: #C02020;
--priority-normal-bg: #DDE0EE;
--priority-normal-text: #2030A0;
--priority-low-bg: #F0EEF0;
--priority-low-text: #444050;
--overdue-text: #DC2626;
--active-green: #10B981;
```

---

## 8. RESUME DES PRIORITES

| Priorite | Probleme | Impact |
|----------|----------|--------|
| Haute | Texte secondaire sous le ratio WCAG AA (3.8:1) | Accessibilite non-conforme |
| Haute | Filtres Pipeline/Taches trop volumineux | Perte d'espace ecran majeure |
| Haute | Chat mobile sans historique conversations | Fonctionnalite inaccessible |
| Haute | $ devant montants EUR | Confusion utilisateur |
| Moyenne | Sections fiche contact sans fond/bordure | Manque de structure visuelle |
| Moyenne | Onglets inactifs a 60% opacite (ratio ~3.5:1) | Accessibilite limite |
| Moyenne | Headers de tableau sans fond | Separation filtres/donnees floue |
| Moyenne | Lignes contacts trop hautes | Moins de donnees visibles |
| Moyenne | Sidebar trop longue (11 items) | Navigation lourde |
| Moyenne | Onglets contact coupes en mobile | UX degradee |
| Moyenne | Taches mobile sans echeance | Info critique masquee |
| Moyenne | Lead score = point colore seul (daltonisme) | Accessibilite |
| Basse | Sidebar liens inactifs a 60% opacite | Lisibilite a la limite |
| Basse | Filter pills bordure trop subtile | Faible affordance |
| Basse | Espaces vides (Segments, Workflows, Rapports) | Impression de vide |
| Basse | Accents manquants | Inconsistance visuelle |
| Basse | Warning React console | Bug technique mineur |
