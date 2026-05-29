# 💾 Gestion des données - Guide complet

## 1️⃣ Stockage actuel (localStorage)

Les données sont stockées **localement dans le navigateur** sur chaque appareil.

### Avantages ✅

- Fonctionne hors ligne
- Instantané (pas d'attente réseau)
- Pas de coûts de serveur
- Respecte la confidentialité

### Inconvénients ❌

- Données non partagées entre appareils/navigateurs
- Risque de perte si le cache est vidé
- Capacité limitée (~5-10MB)

---

## 2️⃣ Exporter les données

### Méthode 1 : Via la console (simple)

1. Ouvrez l'application dans le navigateur
2. Appuyez sur **F12** (ouvre les outils de développement)
3. Allez dans l'onglet **Console**
4. Copiez et collez ce code :

```javascript
// Copier les données
const data = localStorage.getItem('bugReports');
console.log(JSON.parse(data));
copy(data);
```

1. Un fichier JSON est maintenant dans votre clipboard
2. Collez-le dans un éditeur (Notepad, VS Code) et sauvegardez en `.json`

### Méthode 2 : Via JavaScript (plus robuste)

```javascript
// Dans la console
const data = JSON.parse(localStorage.getItem('bugReports') || '[]');
const dataStr = JSON.stringify(data, null, 2);
const dataBlob = new Blob([dataStr], {type: 'application/json'});
const url = URL.createObjectURL(dataBlob);
const link = document.createElement('a');
link.href = url;
link.download = `bug-reports-${new Date().toISOString().split('T')[0]}.json`;
link.click();
```

---

## 3️⃣ Importer les données

### Si vous avez une sauvegarde JSON

1. Dans la console, copiez ce code :

```javascript
// Remplacez PASTE_JSON_HERE par votre contenu JSON
const importedData = [PASTE_JSON_HERE];
localStorage.setItem('bugReports', JSON.stringify(importedData));
console.log('✓ Données importées !');
location.reload(); // Actualiser la page
```

1. Collez votre JSON à la place de `[PASTE_JSON_HERE]`
2. Appuyez sur Entrée
3. La page se recharge automatiquement

---

## 4️⃣ Synchroniser avec GitHub (avancé)

### Option A : Fichier JSON dans le repo (simple)

#### 1. Ajouter un fichier de données au repo

```bash
# Dans votre dossier du projet
echo '[]' > data/reports.json
git add data/
git commit -m "Add data storage file"
git push
```

#### 2. Modifier l'application pour lire depuis ce fichier

Dans `BugReportApp.tsx`, remplacez le `useEffect` de chargement initial :

```typescript
useEffect(() => {
  // Charger depuis le fichier Git
  fetch('/bug-report-app/data/reports.json')
    .then(r => r.json())
    .then(data => setReports(data))
    .catch(() => {
      // Fallback sur localStorage
      const saved = localStorage.getItem('bugReports');
      if (saved) setReports(JSON.parse(saved));
    });

  const savedUsername = localStorage.getItem('username');
  if (savedUsername) {
    setUsername(savedUsername);
    setUsernameSaved(true);
  }
}, []);
```

#### 3. Ajouter une fonction de sauvegarde GitHub

```typescript
const GITHUB_TOKEN = 'votre_token_github_ici'; // Générez-le sur GitHub

async function saveToGitHub() {
  const content = btoa(JSON.stringify(reports, null, 2)); // Encoder en base64
  
  try {
    const response = await fetch(
      'https://api.github.com/repos/VOTRE_USERNAME/bug-report-app/contents/data/reports.json',
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update reports - ${new Date().toLocaleString('fr-FR')}`,
          content: content,
          branch: 'main'
        })
      }
    );
    
    if (response.ok) {
      console.log('✓ Sauvegardé sur GitHub');
    } else {
      console.error('✗ Erreur lors de la sauvegarde');
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
  }
}

// Appelez cette fonction après chaque changement :
useEffect(() => {
  localStorage.setItem('bugReports', JSON.stringify(reports));
  // saveToGitHub(); // Décommenter pour activer
}, [reports]);
```

### Option B : Utiliser Firebase (solution cloud)

1. Créez un compte Firebase : <https://firebase.google.com>

2. Ajoutez Firebase au projet :

```bash
npm install firebase
```

1. Créez un fichier `src/firebase.ts` :

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

1. Dans `BugReportApp.tsx` :

```typescript
import { db } from './firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

// Charger les données
useEffect(() => {
  const loadReports = async () => {
    const querySnapshot = await getDocs(collection(db, 'bugReports'));
    const data: BugReport[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as BugReport);
    });
    setReports(data);
  };
  loadReports();
}, []);

// Sauvegarder les données
const handleSubmitReport = async () => {
  // ... validation ...
  const newReport = { /* ... */ };
  await setDoc(doc(db, 'bugReports', newReport.id), newReport);
  setReports([newReport, ...reports]);
};
```

### Option C : Utiliser Supabase (PostgreSQL gratuit)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

// Charger les données
useEffect(() => {
  supabase
    .from('bug_reports')
    .select('*')
    .then(({ data }) => setReports(data || []));
}, []);

// Sauvegarder
const { data, error } = await supabase
  .from('bug_reports')
  .insert([newReport]);
```

---

## 5️⃣ Sauvegarde/Restauration régulière

### Créer une tâche automatique (sur votre PC)

#### Windows (Batch script)

Créez un fichier `backup-reports.bat` :

```batch
@echo off
REM Exporter les données toutes les 24h

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
set mytime=%time%
set filename=reports-%mydate%.json

echo Sauvegarde en cours...
REM Utilisez un outil comme curl pour télécharger depuis votre app
curl "http://localhost:5173/api/reports" > "C:\Backups\%filename%"

echo Sauvegarde complétée: %filename%
pause
```

#### Mac/Linux (Bash script)

Créez un fichier `backup-reports.sh` :

```bash
#!/bin/bash

BACKUP_DIR="$HOME/bug-reports-backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d)
FILE="$BACKUP_DIR/reports-$DATE.json"

# Optionnel : utiliser curl pour télécharger
# curl "http://localhost:5173/api/reports" > "$FILE"

echo "✓ Sauvegarde créée: $FILE"
```

Ajoutez au crontab :

```bash
0 2 * * * /path/to/backup-reports.sh
```

---

## 6️⃣ Gestion des versions et historique

### Garder un historique dans Git

```bash
# Créez un dossier pour les sauvegardes
mkdir data-backups

# Chaque semaine, exportez et commitez
git add data-backups/
git commit -m "Weekly backup of bug reports"
git push
```

---

## 7️⃣ Sécurité des données

### ⚠️ Ne jamais faire ceci

```javascript
// ❌ MAUVAIS - exposerait les données
localStorage.setItem('bugReports', JSON.stringify(reports));
// Puis quelqu'un pourrait faire :
JSON.parse(localStorage.getItem('bugReports'));
```

### ✅ Bonnes pratiques

```javascript
// ✅ Utiliser des tokens avec expiration
const token = generateSecureToken(); // Généré côté serveur

// ✅ Chiffrer les données sensibles
const encrypted = encrypt(JSON.stringify(reports), encryptionKey);

// ✅ Utiliser HTTPS toujours
// (CloudFront le fait automatiquement sur stepe.click)
```

---

## 📊 Exemple d'export de données

Vos données ressembleront à ceci :

```json
[
  {
    "id": "1704067200000",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "username": "jean",
    "chantier": "Déchargement",
    "transporteur": "Camion",
    "lieu": "Escaut",
    "zone": "Parc",
    "moduleUI": "Écran de gestion des stocks",
    "titre": "Bouton Valider bloqué",
    "description": "Le bouton de validation ne fonctionne pas...",
    "severite": "Majeur",
    "frequence": "Souvent",
    "affecteAutres": "Oui",
    "closed": false
  }
]
```

---

## 🔄 Migration entre solutions

### De localStorage vers GitHub

```javascript
// 1. Exporter depuis localStorage
const data = JSON.parse(localStorage.getItem('bugReports'));

// 2. Uploader le fichier
fetch('api/upload', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### De localStorage vers Firebase

```javascript
// Migration en masse
const reports = JSON.parse(localStorage.getItem('bugReports') || '[]');
for (const report of reports) {
  await setDoc(doc(db, 'bugReports', report.id), report);
}
console.log('✓ Migré ' + reports.length + ' rapports');
```

---

**Besoin d'aide pour la synchronisation ?** Demandez à votre administrateur GitHub.
