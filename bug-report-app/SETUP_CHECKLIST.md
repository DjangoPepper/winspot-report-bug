# ✅ Checklist de Configuration Complète

## 📦 Phase 1 : Préparation locale

### Fichiers à créer/copier dans le dossier du projet

```..
✅ CRÉER le dossier: src/
   ├── BugReportApp.tsx (copier le fichier)
   └── main.tsx (copier le fichier)

✅ COPIER à la racine du projet:
   ├── index.html
   ├── package.json
   ├── vite.config.ts
   ├── tsconfig.json
   ├── tsconfig.node.json
   ├── .gitignore
   ├── README.md
   └── QUICKSTART.md

✅ CRÉER le dossier: .github/workflows/
   └── deploy.yml (copier le fichier: ".github_workflows_deploy.yml")
```..

### Commandes de préparation

```..bash
# 1. Créer le dossier racine du projet
mkdir bug-report-app
cd bug-report-app

# 2. Initialiser Git
git init

# 3. Créer la structure des dossiers
mkdir src
mkdir -p .github/workflows

# 4. Copier TOUS les fichiers fournis aux bons emplacements
# À faire manuellement depuis votre explorateur de fichiers
```.

---

## 🔧 Phase 2 : Configuration Node.js

```.bash
# ✅ Vérifier Node.js est installé
node --version    # Doit afficher v18 ou plus récent
npm --version     # Doit afficher 9 ou plus récent

# ✅ Installer les dépendances
npm install

# ✅ Vérifier l'installation
npm list react    # Doit afficher React
```.

### En cas d'erreur

```.bash
# Nettoyer les caches
npm cache clean --force
rm -rf node_modules package-lock.json

# Réinstaller
npm install
```.

---

## 🏗️ Phase 3 : Tests locaux

```.bash
# ✅ Démarrer le serveur de développement
npm run dev

# ✅ Ouvrir le navigateur
# Allez à: http://localhost:5173

# ✅ Tester les fonctionnalités
# - Entrez un prénom et validez
# - Créez un rapport de test
# - Vérifiez que les données s'affichent
# - Fermez le serveur: Ctrl+C
```.

### Résoudre les problèmes

```.bash
# Si "Port 5173 already in use"
npm run dev -- --port 3000

# Si "Module not found"
npm install
```.

---

## 🌐 Phase 4 : Création GitHub

### 4.1 Créer le repository GitHub

1. Allez à <https://github.com/new>
2. **Repository name** : `bug-report-app`
3. **Description** : "Application de gestion des rapports de bugs UI"
4. **Public** ou **Private** : À votre choix
5. ❌ **NE PAS** cocher "Initialize repository with..."
6. ✅ Cliquez "Create repository"

### 4.2 Pousser le code sur GitHub

```.bash
# Dans votre dossier du projet
git remote add origin https://github.com/YOUR_USERNAME/bug-report-app.git

# Renommer la branche (si nécessaire)
git branch -M main

# Ajouter tous les fichiers
git add .

# Commit initial
git commit -m "Initial commit: React bug report application"

# Pousser sur GitHub
git push -u origin main
```.

### Vérifier le push

Allez à votre repo GitHub, vous devez voir tous les fichiers.

---

## 📡 Phase 5 : Configuration GitHub Pages et Actions

### 5.1 Vérifier le workflow

1. Allez à votre repo GitHub
2. Cliquez sur l'onglet **"Actions"**
3. Vous devez voir le workflow "Deploy to GitHub Pages"
4. Attendez qu'il finisse (✅ vert)

### 5.2 Configurer GitHub Pages

1. Allez à **Settings** → **Pages** (menu de gauche)
2. Sous "Source" ou "Build and deployment"
3. Sélectionnez **"GitHub Actions"**
4. ✅ Sauvegardez

### 5.3 Attendre le déploiement

- La première fois : 2-5 minutes
- Les fois suivantes : 1-2 minutes
- Allez à **Actions** pour voir la progression

### 5.4 Accéder à votre application

Votre app est maintenant à :

```.
https://YOUR_USERNAME.github.io/bug-report-app/
```.

Testez la URL dans le navigateur !

---

## 🔄 Phase 6 : Mise à jour après modifications

### Workflow standard pour chaque modification

```.bash
# 1. Faire vos modifications dans l'éditeur
# (modifier les fichiers dans src/, index.html, etc.)

# 2. Tester localement
npm run dev

# 3. Arrêter le serveur
# (Ctrl+C dans le terminal)

# 4. Valider les changements
git add .
git commit -m "Description claire de vos changements"

# 5. Pousser sur GitHub
git push

# 6. GitHub Actions déploie automatiquement
# Allez dans l'onglet "Actions" pour suivre

# 7. Vérifier sur votre site live
# Attendez 1-2 minutes, puis rafraîchissez https://YOUR_USERNAME.github.io/bug-report-app/
```.

---

## 📋 Phase 7 : Utilisation de l'application

### Configuration initiale

```.
1. Ouvrez https://YOUR_USERNAME.github.io/bug-report-app/
2. Entrez votre prénom (ex: mAx, ThO, Jean)
3. Cliquez "Valider"
4. Votre identité est sauvegardée localement
```.

### Créer un rapport

```.
1. Cliquez "➕ Nouveau Rapport"
2. Remplissez obligatoirement :
   ✓ Chantier
   ✓ Transporteur
   ✓ Lieu
   ✓ Zone
   ✓ Titre du bug
   ✓ Description
3. Complétez les détails optionnels
4. Cliquez "✓ Soumettre le rapport"
```.

### Consulter les rapports

```.
1. Cliquez "📋 Liste des Rapports"
2. Cliquez sur un rapport pour voir les détails
3. Cliquez "← Retour" pour revenir à la liste
```.

### Clôturer un rapport (admin only)

```.
⚙️ Seulement si vous êtes mAx ou ThO

1. Cliquez sur un rapport ouvert
2. Descendez jusqu'à la section "Clôturer ce rapport"
3. Choisissez "Support" ou "Direction"
4. Cliquez "Clôturer"
5. Le rapport devient gris et apparaît en bas de la liste
```.

---

## 🛡️ Phase 8 : Sécurité & Maintenance

### Protéger votre repository

1. **Settings** → **Branches**
2. Ajouter une branche de protection pour `main`
3. ✅ Cocher "Require a pull request before merging"

### Sauvegarder régulièrement

```.bash
# Chaque mois, créez une sauvegarde
cd bug-report-app

# Exporter les données depuis le navigateur
# (Voir DATA_MANAGEMENT.md)

# Créer une branche de sauvegarde
git checkout -b backup-2024-01
git push origin backup-2024-01

# Revenir à main
git checkout main
```.

### Mettre à jour les dépendances

```.bash
# Mensuellement
npm outdated     # Voir les updates disponibles
npm update       # Mettre à jour
git add .
git commit -m "Update dependencies"
git push
```.

---

## 🆘 Dépannage rapide

### L'application affiche une page blanche

```.bash
# 1. Videz le cache
Ctrl+Shift+Delete (dans le navigateur)

# 2. Vérifiez les erreurs
F12 → Console → cherchez les erreurs rouges

# 3. Vérifiez le workflow GitHub Actions
# Actions → vérifiez le déploiement
```.

### Les données disparaissent

```.bash
# C'est normal en développement (localStorage)
# En production : les données persistent

# Pour tester :
npm run dev
# Entrez un prénom et créez un rapport
# Fermez le navigateur et réouvrez : les données restent
```.

### Erreur "404 not found" en production

```.
❌ Problème : mauvais chemin de base

✅ Solution : Vérifiez vite.config.ts
   base: '/bug-report-app/'  // Doit correspondre à votre repo
```.

### Le build échoue

```.bash
# 1. Vérifiez les erreurs TypeScript
npm run build

# 2. Fixez les erreurs affichées

# 3. Testez localement
npm run dev

# 4. Poussez sur GitHub
git add .
git commit -m "Fix build errors"
git push
```.

---

## 📞 Support techniques

### Ressources utiles

- **Vite docs** : <https://vitejs.dev/>
- **React docs** : <https://react.dev/>
- **GitHub Pages docs** : <https://pages.github.com/>
- **GitHub Actions docs** : <https://docs.github.com/en/actions>

### Communauté

- **Stack Overflow** : Taggez vos questions avec `react`, `vite`, `github-pages`
- **GitHub Issues** : Cherchez dans les issues existantes
- **Reddit** : r/reactjs, r/github

---

## 🎯 Checklist finale

Avant de dire "c'est prêt" :

```.
✅ npm install réussit
✅ npm run dev fonctionne (http://localhost:5173)
✅ Application affichée correctement en local
✅ GitHub repo créé
✅ Code pushé sur GitHub (main)
✅ Workflow déploiement visible dans Actions
✅ GitHub Pages configuré
✅ Application accessible sur https://YOUR_USERNAME.github.io/bug-report-app/
✅ Formulaire fonctionne en production
✅ Données sauvegardées en localStorage
✅ Admin peut clôturer les rapports (mAx/ThO)
✅ Lien partagé avec l'équipe
```.

---

## 🎉 Vous avez réussi

Votre application est maintenant en production et prête à être utilisée par votre équipe.

Pour toute modification future : **modifiez → testez → commitez → poussez → GitHub fait le reste**

Bonne utilisation ! 🚀
