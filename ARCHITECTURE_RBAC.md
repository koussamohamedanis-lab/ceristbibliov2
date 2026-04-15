# Architecture RBAC - Documentation des Routes et Composants

## Structure de Routage (App.jsx)

L'application utilise **React Router v7** avec un système de protection basé sur les rôles JWT. Toutes les routes sont protégées sauf `/login` et `/register`.

### Routes Publiques
```
/login              → Page de connexion
/register           → Page d'enregistrement
```

### Routes Protégées by Role

#### Chercheur (Tous les rôles)
```
/                   → Dashboard Profil (Par défaut)
/dashboard-profil   → Dashboard Profil Détaillé
```

#### Chef d'Équipe
```
/gestion-equipe     → Gestion des chercheurs de l'équipe (CRUD)
```

#### Chef de Laboratoire
```
/gestion-labo       → Gestion des équipes du laboratoire
/gestion-equipe     → Héritage: Gestion des équipes
```

#### Directeur / Tutelle
```
/dashboard-macro    → Dashboard macro avec analyses globales
```

## Composants Créés

### 1. ProtectedRoute.jsx
**Localisation**: `src/components/ProtectedRoute.jsx`

Component qui protège les routes en vérifiant:
- Présence du token JWT dans localStorage
- Rôle de l'utilisateur (optionnel)

**Props**:
- `children` (ReactNode): Composant à afficher si autorisé
- `allowedRoles` (Array<string>): Liste des rôles autorisés

**Comportement**:
- Si pas de token → Redirection vers /login
- Si rôle non autorisé → Affichage d'un message "Accès Refusé"
- Si autorisé → Affichage du composant enfant

### 2. KPICard.jsx
**Localisation**: `src/components/KPICard.jsx`

Carte affichant un indicateur clé de performance.

**Props**:
- `title` (string): Titre de l'indicateur (ex: "H-Index")
- `value` (number): Valeur à afficher
- `icon` (ReactNode): Icône (utilise react-icons)
- `backgroundColor` (string): Couleur de fond personnalisée

**Exemple d'utilisation**:
```jsx
<KPICard
  title="H-Index"
  value={4}
  icon={<FiTrendingUp size={32} />}
  backgroundColor="rgba(22, 163, 74, 0.08)"
/>
```

### 3. PublicationsChart.jsx
**Localisation**: `src/components/PublicationsChart.jsx`

Graphique LineChart (Recharts) affichant l'évolution des publications.

**Props**:
- `data` (Array<{year: number, count: number}>): Données de publications par année

**Format des données**:
```javascript
[
  { year: 2021, count: 5 },
  { year: 2022, count: 8 },
  { year: 2023, count: 12 }
]
```

### 4. PublicationsTable.jsx
**Localisation**: `src/components/PublicationsTable.jsx`

Tableau paginé des publications avec lien vers DOI.

**Props**:
- `publications` (Array<{title, year, type, citations_count, doi}>): Liste des publications

**Fonctionnalités**:
- Pagination automatique (5 items par page)
- Liens cliquables vers les DOI externes
- Badges de type (Article, Conférence, etc.)
- État "Aucune publication" si vide

### 5. ProfileBadges.jsx
**Localisation**: `src/components/ProfileBadges.jsx`

Grille de badges cliquables vers les profils externes.

**Props**:
- `profiles` (Object): Objets avec identifiants externes
  - `open_alex_id`: ID OpenAlex
  - `orcid`: Numéro ORCID
  - `pubmed_id`: ID PubMed
  - `scopus_id`: ID Scopus

**Exemple**:
```jsx
<ProfileBadges profiles={{
  open_alex_id: 'A5023888',
  orcid: '0000-0001-2345-6789'
}} />
```

### 6. DashboardProfil.jsx
**Localisation**: `src/pages/DashboardProfil.jsx`

Page principale du tableau de bord pour les chercheurs.

**Fonctionnalités**:
- Affiche les KPI (H-Index, Citations, Publications)
- Graphique d'évolution des publications par année
- Tableau paginé des publications
- Badges des profils externes
- Fetch des données utilisateur depuis l'API

**Flux de données**:
1. Au montage: Récupère l'ID utilisateur depuis localStorage
2. Appelle `/auth/{userId}` pour récupérer les données
3. Génère les données du graphique
4. Affiche le dashboard

## Variables CSS Utilisées

Toutes les variables sont définies dans `src/assets/style.css` root:

```css
--bg-main: #F8FAFC           /* Arrière-plan principal */
--bg-cartes: #FFFFFF         /* Fond des cartes */
--main-green: #16A34A        /* Couleur primaire verte */
--hover-green: #22C55E       /* Couleur au survol */
--main-text: #0F172A         /* Texte principal */
--sec-text: #475569          /* Texte secondaire */
--bordres: #E2E8F0           /* Bordures */
--radius: 12px               /* Rayon de bordure */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.1)
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1)
```

## Stockage des Données (localStorage)

**Après une connexion réussie**, les données suivantes sont stockées:

```javascript
localStorage.setItem('access_token', 'eyJhbGciOiJIUzI1NiIs...')
localStorage.setItem('userId', '4')
localStorage.setItem('userRole', 'chercheur')
```

## Styles Personnalisés (dashboard.css)

Le fichier `src/assets/dashboard.css` contient tous les styles spécifiques au dashboard:

- `.dashboard-container`: Conteneur principal
- `.kpi-card`: Carte KPI avec hover effect
- `.chart-container`: Conteneur du graphique
- `.publications-table`: Tableau des publications
- `.pagination`: Boutons de pagination
- `.profile-badges-container`: Grille des badges
- `.type-badge`: Badge du type de publication
- `.action-link`: Lien d'action (ex: lien DOI)

## Dépendances

```json
{
  "react": "^19.2.0",
  "react-router-dom": "^7.13.1",
  "recharts": "^2.x.x",
  "axios": "^1.13.6",
  "react-icons": "^5.5.0"
}
```

## Hiérarchie des Rôles (Héritage des Accès)

```
Chercheur
    ↓
Chef d'Équipe (hérite de Chercheur)
    ↓
Chef de Laboratoire (hérite de Chef d'Équipe)
    ↓
Directeur/Tutelle (niveau administratif)
```

## Prochaines Étapes

### À Implémenter:
1. **GestionEquipe.jsx** - CRUD pour chercheurs d'une équipe
2. **GestionLaboratoire.jsx** - CRUD pour équipes du labo
3. **DashboardMacro.jsx** - Graphiques comparatifs BarChart et PieChart
4. **Backend API endpoints**:
   - `GET /api/equipes/{equipe_id}/chercheurs` - Liste chercheurs
   - `POST /api/chercheurs` - Créer chercheur
   - `PUT /api/chercheurs/{chercheur_id}` - Modifier chercheur
   - `GET /api/laboratoires/{labo_id}/stats` - Statistiques macros

### Améliorations:
1. Intégration réelle avec OpenAlex API pour H-Index et citations
2. Système de cache pour les données utilisateur
3. Export des données (PDF, Excel)
4. Notifications en temps réel
5. Système de filtrage et recherche avancée

## Tester la Structure

1. **Backend doit être actif**:
   ```bash
   cd Backend
   uvicorn main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd ceristbiblio_platform
   npm run dev
   ```

3. **Accéder à** http://localhost:5173
   - Se connecter avec: testuser@example.com / testpass123
   - Rôle: chercheur
   - Voir le Dashboard avec KPI, graphique, publications

---

**Version**: 1.0  
**Créé**: Avril 2026  
**Stack**: React + FastAPI + Recharts + PostgreSQL
