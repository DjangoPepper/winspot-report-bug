# 🚀 Guide de démarrage rapide

## Étape 1 : Préparer le projet localement

### Sur Windows avec Git Bash / Mac / Linux

```bash
# 1. Créez un dossier pour le projet
mkdir bug-report-app
cd bug-report-app

# 2. Initialisez Git
git init

# 3. Copiez TOUS les fichiers fournis dans ce dossier :
# - src/BugReportApp.tsx (créer le dossier src d'abord)
# - src/main.tsx
# - index.html
# - package.json
# - vite.config.ts
# - tsconfig.json
# - tsconfig.node.json
# - .gitignore
# - README.md
```

## Étape 2 : Structure des dossiers

```.
bug-report-app/
├── src/
│   ├── BugReportApp.tsx
│   └── main.tsx
├── .github/
│   └── workflows/
│       └── deploy.yml
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── .gitignore
└── README.md
```

## Étape 3 : Configuration locale

### Installer Node.js

Téléchargez et installez depuis <https://nodejs.org> (version LTS)

### Installer les dépendances

```bash
npm install
```

### Tester localement

```bash
npm run dev
```

Ouvrez <http://localhost:5173> dans votre navigateur. Vous devriez voir l'application !

## Étape 4 : Créer le repository GitHub

### 1. Créer un repo vide sur GitHub

- Allez sur <https://github.com/new>
- Nom du repository : `bug-report-app`
- Description : "Application de gestion de rapports de bugs"
- **Ne pas initialiser avec README, .gitignore ou license**
- Cliquez "Create repository"

### 2. Connecter votre repo local

```bash
# Remplacez YOUR_USERNAME par votre nom d'utilisateur GitHub
git remote add origin https://github.com/YOUR_USERNAME/bug-report-app.git

# Branche principale
git branch -M main

# Ajoutez tous les fichiers
git add .

# Commit initial
git commit -m "Initial commit: Bug report application"

# Poussez sur GitHub
git push -u origin main
```

## Étape 5 : Configurer le déploiement GitHub Pages

### 1. Créer le dossier `.github/workflows`

```bash
mkdir -p .github/workflows
```

### 2. Créer le fichier `deploy.yml`

Copiez le contenu fourni dans `.github/workflows/deploy.yml`

### 3. Pousser sur GitHub

```bash
git add .github/
git commit -m "Add GitHub Actions workflow"
git push
```

## Étape 6 : Configurer GitHub Pages

### 1. Allez sur <https://github.com/YOUR_USERNAME/bug-report-app/settings>

### 2. Cliquez sur "Pages" (à gauche)

### 3. Sous "Build and deployment"

- Sélectionnez "GitHub Actions" comme source

### 4. L'application sera disponible à

   ```.
   https://YOUR_USERNAME.github.io/bug-report-app/
   ```

## Étape 7 : Utilisation de l'application

### Première visite

1. Entrez votre prénom (Ex: mAx, ThO, Jean)
2. Cliquez "Valider"

### Créer un rapport

1. Cliquez "➕ Nouveau Rapport"
2. Remplissez les champs (les * sont obligatoires)
3. Cliquez "✓ Soumettre le rapport"

### Consulter les rapports

1. Cliquez "📋 Liste des Rapports"
2. Cliquez sur un rapport pour voir les détails

### Clôturer un rapport (admin seulement)

- Si vous êtes "mAx" ou "ThO"
- Cliquez sur un rapport ouvert
- Sélectionnez "support" ou "direction"
- Cliquez "Clôturer"

## ⚙️ Configuration personnalisée

### Changer le port (si 5173 est occupé)

```bash
npm run dev -- --port 3000
```

### Nettoyer les données locales

```javascript
// Dans la console du navigateur (F12)
localStorage.clear()
```

### Exporter les données

```javascript
// Dans la console du navigateur (F12)
copy(localStorage.getItem('bugReports'))
```

## 🚨 Problèmes courants

### "npm: command not found"

→ Installez Node.js depuis <https://nodejs.org>

### "Port 5173 already in use"

→ Utilisez un autre port : `npm run dev -- --port 3000`

### Les données disparaissent après refresh

→ C'est normal en développement. En production, elles sont sauvegardées en localStorage.

### L'application affiche une page blanche sur GitHub Pages

→ Attendez quelques minutes après le premier déploiement
→ Videz le cache du navigateur (Ctrl+Shift+Delete)

### Build fails avec "404 not found"

→ Vérifiez que `vite.config.ts` contient le bon `base: '/bug-report-app/'`

## 📡 Synchroniser avec GitHub (optionnel)

Pour sauvegarder les données directement dans GitHub, modifiez `vite.config.ts` :

```typescript
base: process.env.NODE_ENV === 'production' 
  ? '/bug-report-app/' 
  : '/',
```

## 🔄 Mettre à jour après modifications

```bash
# Faire vos modifications
# ...

# Ensuite :
git add .
git commit -m "Description des changements"
git push

# GitHub Actions construira et déploiera automatiquement
```

## 📞 Besoin d'aide ?

1. **Vérifiez la console** : F12 → Console → regardez les erreurs rouges
2. **Vérifiez les logs GitHub** : Allez dans Actions (sur GitHub)
3. **Redémarrez** : Souvent la solution magique

---

**Vous êtes maintenant prêt !** 🎉

Votre application est accessible à :

```.
https://YOUR_USERNAME.github.io/bug-report-app/
```

Partagez ce lien avec votre équipe !
