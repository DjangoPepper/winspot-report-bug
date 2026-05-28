# 🏭 Application de Rapport de Bugs - Stockage Métallurgique

Application web React/TypeScript pour gérer les déclarations de bugs de l'interface utilisateur avec stockage local et gestion des rôles utilisateurs.

## ✨ Caractéristiques

- ✅ **Interface responsive** : Optimisée pour tablette (PdA) et PC
- ✅ **Gestion des utilisateurs** : Prénom + rôles (mAx, ThO = administrateurs)
- ✅ **Clôture des rapports** : Seuls les admins peuvent clôturer, signés "support" ou "direction"
- ✅ **Données structurées** : Chantier, Transporteur, Lieu, Zone, Type de bug, Sévérité, etc.
- ✅ **Stockage local** : Les données sont sauvegardées automatiquement en localStorage
- ✅ **Déploiement sur GitHub Pages** : Gratuit, facile à mettre à jour
- ✅ **Design industriel** : Interface claire et professionnelle

## 📋 Champs de formulaire

### Informations de contexte

- **Chantier** : Déchargement | Chargement | Embarquement (navire) | Débarquement (navire)
- **Transporteur** : Camion | Navire | Train SNCF | Train Mardyck
- **Lieu** : Escaut | F12 | F13
- **Zone** : Parc | Entrepot

### Description du bug

- Titre du bug
- Module/Zone UI concernée
- Description détaillée
- Étapes pour reproduire (5 champs)
- Résultat attendu vs Résultat réel
- Type de bug UI
- Observations supplémentaires

### Classification

- **Sévérité** : Critique (🔴) | Majeur (🟠) | Mineur (🟢)
- **Fréquence** : À chaque fois | Souvent | Occasionnellement | Rare
- **Affecte autres utilisateurs** : Oui | Non | Incertain

## 🚀 Installation & Déploiement

### 1. Créer un repository GitHub

```bash
# Sur votre PC
git clone https://github.com/yourusername/bug-report-repo.git
cd bug-report-repo
```

### 2. Structure des fichiers

Créez cette structure dans votre repo :

```.
bug-report-repo/
├── src/
│   ├── BugReportApp.tsx      (le composant principal)
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .gitignore
└── README.md
```

### 3. Installation des dépendances

```bash
npm install
```

### 4. Développement local

```bash
npm run dev
```

L'application sera disponible à `http://localhost:5173`

### 5. Build et déploiement

```bash
npm run build
npm run deploy
```

Cela crée une version optimisée et la déploie sur GitHub Pages.

### 6. Configuration GitHub Pages

1. Allez dans les **Settings** de votre repo GitHub
2. Allez dans **Pages** (section sur la gauche)
3. Sélectionnez **Branch: gh-pages** comme source
4. L'application sera disponible à : `https://yourusername.github.io/bug-report-repo/`

## 💾 Stockage des données

### Actuellement (localStorage)

Les données sont stockées dans le **localStorage du navigateur**. Chaque appareil/navigateur a sa propre base de données.

### Option : Synchroniser avec GitHub (avancé)

Pour synchroniser les données avec GitHub, modifiez `BugReportApp.tsx` pour ajouter l'authentification GitHub API :

```typescript
// À la fin du fichier, ajouter :

const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
const GITHUB_REPO = 'yourusername/bug-report-repo';

async function saveToGitHub(reports: BugReport[]) {
  const content = btoa(JSON.stringify(reports, null, 2));
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/data.json`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update bug reports',
        content: content,
        branch: 'main'
      })
    }
  );
  return response.json();
}
```

Puis créez un fichier `.env` :

```.
REACT_APP_GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

### Option : Utiliser une base de données cloud

Intégrez **Firebase**, **Supabase**, ou **MongoDB** pour un stockage central :

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = { /* votre config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Puis remplacez le localStorage par des appels Firestore
```

## 👥 Rôles utilisateurs

### Tous les utilisateurs

- ✅ Soumettre des rapports de bugs
- ✅ Consulter les rapports existants
- ✅ Voir les détails de chaque rapport

### Administrateurs (mAx, ThO)

- ✅ Tous les droits ci-dessus
- ✅ **Clôturer les rapports** et les signer "support" ou "direction"
- ✅ Voir les rapports clôturés

## 🎨 Personnalisation

### Changer les couleurs

Dans `BugReportApp.tsx`, modifiez :

```typescript
backgroundColor: '#1F4788' // Bleu foncé (header)
backgroundColor: '#92D050' // Vert (bouton soumettre)
color: '#2E5FA8'           // Bleu moyen (titres)
```

### Changer le titre et description

```typescript
<h1>Mon titre personnalisé</h1>
<p>Ma description</p>
```

### Ajouter des champs supplémentaires

1. Ajoutez-les à l'interface `BugReport`
2. Ajoutez des inputs dans le formulaire
3. Sauvegardez dans le state

## 📱 Optimisation mobile/tablette

L'application utilise **CSS Grid** qui s'adapte automatiquement :

```typescript
display: 'grid',
gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
gap: '15px'
```

Cela crée des colonnes fluides qui s'ajustent à la taille de l'écran.

## 🐛 Dépannage

### Les données ne se sauvegardent pas

- Vérifiez que le localStorage n'est pas désactivé dans le navigateur
- Essayez dans un onglet privé/incognito

### L'application est lente

- Videz le localStorage : `localStorage.clear()`
- Cela supprimera tous les rapports locaux

### Erreur lors du déploiement

```bash
npm install gh-pages --save-dev
npm run deploy
```

## 📞 Support

Pour les questions techniques :

1. Vérifiez la console du navigateur (F12)
2. Regardez les erreurs dans le terminal
3. Assurez-vous que Node.js est à jour : `node --version`

## 📄 Licence

Ce projet est libre d'utilisation pour usage interne.

---

**Créé pour : Gestion de stockage de produits métallurgiques**
**Dernier update : 2025**
