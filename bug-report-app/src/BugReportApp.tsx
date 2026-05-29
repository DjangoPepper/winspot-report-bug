import React, { useState, useEffect } from 'react';

// GitHub synchronization
const GITHUB_TOKEN = (import.meta as any).env.VITE_GITHUB_TOKEN || '';
const GITHUB_REPO = (import.meta as any).env.VITE_GITHUB_REPO || 'DjangoPepper/winspot-report-bug';

async function saveToGitHub(reports: BugReport[]): Promise<boolean> {
  if (!GITHUB_TOKEN) {
    console.warn('GitHub token not configured');
    return false;
  }

  try {
    const content = btoa(JSON.stringify(reports, null, 2));
    let sha: string | undefined;

    // Get current file SHA if it exists
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/data.json`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      if (getResponse.ok) {
        const data = await getResponse.json();
        sha = data.sha;
      }
    } catch (err) {
      console.log('File does not exist yet, will create it');
    }

    // Upload/update file
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/data.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update bug reports - ${new Date().toLocaleString('fr-FR')}`,
          content: content,
          sha: sha,
          branch: 'main'
        })
      }
    );

    if (!response.ok) {
      console.error('GitHub sync failed:', await response.text());
      return false;
    }

    console.log('Successfully synced to GitHub');
    return true;
  } catch (err) {
    console.error('GitHub sync error:', err);
    return false;
  }
}

async function createGitHubIssue(report: BugReport): Promise<boolean> {
  if (!GITHUB_TOKEN) {
    console.warn('GitHub token not configured');
    return false;
  }

  try {
    const body = `## 🐛 Rapport de Bug

**👤 Rapporteur:** ${report.username}
**📅 Date:** ${new Date(report.timestamp).toLocaleDateString('fr-FR')}
**⚠️ Sévérité:** ${report.severite}

### 📋 Détails
- **Chantier:** ${report.chantier}
- **Transporteur:** ${report.transporteur}
- **Lieu:** ${report.lieu}
- **Zone:** ${report.zone}
- **Interface:** ${report.interface}
- **Type:** ${report.typeBug}
- **Fréquence:** ${report.frequence}
- **Affecte autres:** ${report.affecteAutres}

### 📝 Description
${report.description}

${report.moduleUI ? `### 🗂️ Module/Zone concernée\n${report.moduleUI}\n` : ''}

${report.etapes.some(e => e.trim()) ? `### 🔧 Étapes pour reproduire\n${report.etapes.filter(e => e.trim()).map((e, i) => `${i + 1}. ${e}`).join('\n')}\n` : ''}

${report.resultatAttendu ? `### ✓ Résultat attendu\n${report.resultatAttendu}\n` : ''}

${report.resultatReel ? `### ✗ Résultat réel (le bug)\n${report.resultatReel}\n` : ''}

${report.observations ? `### 📌 Observations\n${report.observations}` : ''}

---
*ID: ${report.id}*`;

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          title: `[${report.severite}] ${report.titre}`,
          body: body,
          labels: [report.severite, report.interface]
        })
      }
    );

    if (!response.ok) {
      console.error('GitHub issue creation failed:', await response.text());
      return false;
    }

    console.log('GitHub issue created successfully');
    return true;
  } catch (err) {
    console.error('GitHub issue creation error:', err);
    return false;
  }
}

interface BugReport {
  id: string;
  timestamp: string;
  username: string;
  interface: 'PC' | 'PdA' | 'Tablette';
  chantier: 'Déchargement' | 'Chargement' | 'Embarquement' | 'Débarquement';
  transporteur: 'Camion' | 'Navire' | 'Train SNCF' | 'Train Mardyck';
  lieu: 'Escaut' | 'F12' | 'F13';
  zone: 'Parc' | 'Entrepot';
  moduleUI: string;
  titre: string;
  description: string;
  etapes: string[];
  resultatAttendu: string;
  resultatReel: string;
  typeBug: string;
  severite: 'Critique' | 'Majeur' | 'Mineur';
  frequence: 'À chaque fois' | 'Souvent' | 'Occasionnellement' | 'Rare';
  affecteAutres: 'Oui' | 'Non' | 'Incertain';
  observations: string;
  photos?: string[]; // URLs des photos Firebase Storage
  status: 'déclarer' | 'transmis' | 'résolus';
  statusHistory: {
    status: string;
    timestamp: string;
  }[];
  closed: boolean;
  closedBy?: 'support' | 'direction';
  closedByUser?: string;
  closedDate?: string;
}

const BugReportApp: React.FC = () => {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [view, setView] = useState<'form' | 'list'>('list');
  const [username, setUsername] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [formData, setFormData] = useState<Partial<BugReport>>({
    chantier: 'Déchargement',
    transporteur: 'Camion',
    lieu: 'Escaut',
    zone: 'Parc',
    interface: 'PC',
    severite: 'Majeur',
    frequence: 'Souvent',
    affecteAutres: 'Non',
    etapes: ['', '', '', '', ''],
    typeBug: '',
    status: 'déclarer'
  });
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [closeType, setCloseType] = useState<'support' | 'direction'>('support');
  const [photosToUpload, setPhotosToUpload] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalPhoto, setModalPhoto] = useState<string | null>(null);

  const isAdmin = ['mAx', 'ThO', 'ProG'].includes(username);
  const isSuperAdmin = username === 'ProG';

  // Load from localStorage
  useEffect(() => {
    const loadReports = async () => {
      try {
        const saved = localStorage.getItem('bugReports');
        if (saved) {
          const parsed: BugReport[] = JSON.parse(saved);
          // Normalize old reports that may miss newer fields
          const normalized = parsed.map(r => ({
            ...r,
            status: r.status || 'déclarer',
            statusHistory: Array.isArray(r.statusHistory)
              ? r.statusHistory
              : [{ status: r.status || 'déclarer', timestamp: r.timestamp || new Date().toISOString() }],
            etapes: Array.isArray(r.etapes) ? r.etapes : [],
            closed: r.closed ?? false,
          }));
          setReports(normalized);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des rapports:', error);
      }
    };

    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
      setUsernameSaved(true);
    }

    loadReports();
  }, []);

  // Save to localStorage
  useEffect(() => {
    const saveReports = async () => {
      localStorage.setItem('bugReports', JSON.stringify(reports));
      
      // Sync to GitHub if token is configured
      if (GITHUB_TOKEN && reports.length > 0) {
        setSyncStatus('syncing');
        saveToGitHub(reports).then(success => {
          if (success) {
            setSyncStatus('success');
            setSyncMessage('Synchronisé avec GitHub ✓');
            setTimeout(() => setSyncStatus('idle'), 3000);
          } else {
            setSyncStatus('error');
            setSyncMessage('Erreur de synchronisation');
            setTimeout(() => setSyncStatus('idle'), 3000);
          }
        });
      }
    };

    saveReports();
  }, [reports]);

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    if (newUsername.trim()) {
      localStorage.setItem('username', newUsername);
      setUsernameSaved(true);
    }
  };

  const handleDeleteReport = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      setReports(reports.filter(r => r.id !== id));
      setSelectedReport(null);
    }
  };

  const handleUncloseReport = (id: string) => {
    setReports(reports.map(r => 
      r.id === id 
        ? { ...r, closed: false, status: 'déclarer' as const, statusHistory: [...r.statusHistory, { status: 'déclarer (Réouvert)', timestamp: new Date().toISOString() }] } 
        : r
    ));
    setSelectedReport(null);
  };

  const handleStatusUpdate = (id: string, newStatus: 'déclarer' | 'transmis' | 'résolus') => {
    let updatedReport: BugReport | null = null;
    setReports(reports.map(r => {
      if (r.id === id) {
        const updatedHistory = [...r.statusHistory, { status: newStatus, timestamp: new Date().toISOString() }];
        updatedReport = {
          ...r,
          status: newStatus,
          statusHistory: updatedHistory,
          closed: newStatus === 'résolus'
        };
        return updatedReport;
      }
      return r;
    }));
    // Keep the open detail view in sync
    if (updatedReport && selectedReport?.id === id) {
      setSelectedReport(updatedReport);
    }
  };

  const handleRelance = (id: string) => {
    const report = reports.find(r => r.id === id);
    if (report) {
      const updatedReport = { ...report, timestamp: new Date().toISOString() };
      const otherReports = reports.filter(r => r.id !== id);
      setReports([updatedReport, ...otherReports]);
      alert('Rapport remonté en tête de liste !');
    }
  };

  const handleSaveBackup = () => {
    try {
      const data = JSON.stringify(reports, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = `winspot-bugs-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du backup');
    }
  };

  const handleCopyToClipboard = (report: BugReport) => {
    const text = `
RAPPORT DE BUG WINSPOT
----------------------
Titre: ${report.titre}
Sévérité: ${report.severite}
Date: ${new Date(report.timestamp).toLocaleString('fr-FR')}
Rapporteur: ${report.username}
Status: ${report.status}

Description:
${report.description}

Lieu: ${report.lieu} | Zone: ${report.zone}
Chantier: ${report.chantier} | Transporteur: ${report.transporteur}
----------------------
    `.trim();
    navigator.clipboard.writeText(text);
    alert('Rapport copié dans le presse-papiers ! ctrl + v pour coller');
  };

  const handleSubmitReport = async () => {
    const missingFields: string[] = [];
    if (!usernameSaved) missingFields.push('Prénom (en haut de la page)');
    if (!formData.titre?.trim()) missingFields.push('Titre du bug');
    if (!formData.interface) missingFields.push('Interface');
    if (!formData.description?.trim()) missingFields.push('Description détaillée');

    if (missingFields.length > 0) {
      alert(
        'Veuillez remplir les champs obligatoires suivants :\n\n• ' +
          missingFields.join('\n• ')
      );
      return;
    }

    setUploadingPhotos(true);
    let photoBase64: string[] = [];

    // Convert photos to Base64
    if (photosToUpload.length > 0) {
      try {
        for (const file of photosToUpload) {
          const reader = new FileReader();
          await new Promise((resolve, reject) => {
            reader.onload = () => {
              photoBase64.push(reader.result as string);
              resolve(null);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      } catch (error) {
        console.error('Erreur lors de la conversion des photos:', error);
        alert('Erreur lors de la conversion des photos');
        setUploadingPhotos(false);
        return;
      }
    }

    if (isEditing && formData.id) {
      const updatedReports = reports.map(r => 
        r.id === formData.id ? { ...r, ...formData as BugReport, photos: photoBase64.length > 0 ? photoBase64 : r.photos } : r
      );
      setReports(updatedReports);
      setIsEditing(false);
    } else {
      const now = new Date().toISOString();
      const newReport: BugReport = {
        id: Date.now().toString(),
        timestamp: now,
        username: username,
        interface: formData.interface as any,
        chantier: formData.chantier as any,
        transporteur: formData.transporteur as any,
        lieu: formData.lieu as any,
        zone: formData.zone as any,
        moduleUI: formData.moduleUI || '',
        titre: formData.titre || '',
        description: formData.description || '',
        etapes: formData.etapes || [],
        resultatAttendu: formData.resultatAttendu || '',
        resultatReel: formData.resultatReel || '',
        typeBug: formData.typeBug || '',
        severite: formData.severite as any,
        frequence: formData.frequence as any,
        affecteAutres: formData.affecteAutres as any,
        observations: formData.observations || '',
        photos: photoBase64,
        status: 'déclarer',
        statusHistory: [{ status: 'déclarer', timestamp: now }],
        closed: false
      };

      // Add to local state
      setReports([newReport, ...reports]);

      // Create GitHub Issue if token is configured
      if (GITHUB_TOKEN) {
        const success = await createGitHubIssue(newReport);
        if (success) {
          setSyncStatus('success');
          setSyncMessage('Rapport créé et GitHub Issue générée ✓');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
          setSyncStatus('error');
          setSyncMessage('Rapport créé mais issue GitHub échouée');
          setTimeout(() => setSyncStatus('idle'), 3000);
        }
      }
    }
    
    // Reset form
    setFormData({
      chantier: 'Déchargement',
      transporteur: 'Camion',
      lieu: 'Escaut',
      zone: 'Parc',
      severite: 'Majeur',
      frequence: 'Souvent',
      affecteAutres: 'Non',
      etapes: ['', '', '', '', ''],
      typeBug: ''
    });
    setPhotosToUpload([]);
    setUploadingPhotos(false);
    setView('list');
  };

  const handleEditClick = (report: BugReport) => {
    setFormData(report);
    setIsEditing(true);
    setView('form');
  };

  const handleCloseReport = async (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      const now = new Date().toISOString();
      const updated = reports.map(r =>
        r.id === reportId
          ? {
              ...r,
              closed: true,
              status: 'résolus' as const,
              statusHistory: [...r.statusHistory, { status: `résolus (${closeType})`, timestamp: now }],
              closedBy: closeType,
              closedByUser: username,
              closedDate: new Date().toISOString()
            }
          : r
      );
      setReports(updated);
      setSelectedReport(null);
    }
  };

  const getSeverityColor = (severite: string) => {
    switch (severite) {
      case 'Critique':
        return '#C00000';
      case 'Majeur':
        return '#FFC000';
      case 'Mineur':
        return '#92D050';
      default:
        return '#999999';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'déclarer':
        return '#DC143C'; // Crimson
      case 'transmis':
        return '#FF0000'; // Red
      case 'résolus':
        return '#008000'; // Green
      default:
        return '#666';
    }
  };

  const openReports = reports.filter(r => !r.closed).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const closedReports = reports.filter(r => r.closed).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '0' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1F4788', color: 'white', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* <img src="socit_du_terminal_de_l_escaut_ste_cover.jfif" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} /> */}
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>🏭 Rapport de Bugs - Winspot</h1>
          <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>Interface pour déclarer et suivre les dysfonctionnements</p>
        </div>
      </div>

      {/* Username Bar */}
      {!usernameSaved ? (
        <div style={{ backgroundColor: '#fff3cd', padding: '15px 20px', borderBottom: '1px solid #ffc107', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: '#856404' }}>👤 Entrez votre prénom:</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ex: sandra, geoffroy,..."
            style={{ padding: '8px 12px', border: '1px solid #ffc107', borderRadius: '4px', fontSize: '14px', flex: 1, minWidth: '150px' }}
          />
          <button
            onClick={() => handleUsernameChange(username)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1F4788',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Valider
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#e7f3ff', padding: '12px 20px', borderBottom: '1px solid #0066cc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ color: '#0066cc', fontWeight: '500' }}>👤 Connecté en tant que: <strong>{username}</strong> {isAdmin ? '(Admin)' : ''}</span>
          <button
            onClick={() => {
              setUsernameSaved(false);
              setUsername('');
              localStorage.removeItem('username');
            }}
            style={{ padding: '6px 12px', backgroundColor: 'white', color: '#0066cc', border: '1px solid #0066cc', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Changer
          </button>
        </div>
      )}

      {/* Sync Status */}
      {syncStatus !== 'idle' && (
        <div style={{
          backgroundColor: syncStatus === 'success' ? '#d4edda' : syncStatus === 'error' ? '#f8d7da' : '#fff3cd',
          color: syncStatus === 'success' ? '#155724' : syncStatus === 'error' ? '#721c24' : '#856404',
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {syncStatus === 'syncing' && '⏳ Synchronisation en cours...'}
          {syncStatus === 'success' && '✓ ' + syncMessage}
          {syncStatus === 'error' && '✗ ' + syncMessage}
        </div>
      )}

      {usernameSaved && (
        <div style={{ backgroundColor: 'white', padding: '15px 20px', borderBottom: '1px solid #ddd', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Navigation */}
          <button
            onClick={() => { setView('list'); setIsEditing(false); }}
            style={{
              padding: '10px 20px',
              backgroundColor: view === 'list' ? '#1F4788' : '#f0f0f0',
              color: view === 'list' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            📋 Liste des Rapports ({openReports.length} ouverts)
          </button>
          <button
            onClick={() => {
              setView('form');
              setIsEditing(false);
              setSelectedReport(null);
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: view === 'form' ? '#1F4788' : '#f0f0f0',
              color: view === 'form' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            ➕ Nouveau Rapport
          </button>
          <button
            onClick={handleSaveBackup}
            title="Télécharger une sauvegarde locale (JSON)"
            style={{
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              marginLeft: 'auto'
            }}
          >
            💾 Sauvegarder
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* FORM VIEW */}
        {view === 'form' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: '0', color: '#1F4788' }}>{isEditing ? 'Modifier le rapport' : 'Déclarer un nouveau bug'}</h2>

            {/* Row: Chantier, Transporteur */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Chantier *</label>
                <select
                  value={formData.chantier || ''}
                  onChange={(e) => setFormData({ ...formData, chantier: e.target.value as any })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="Déchargement">Déchargement</option>
                  <option value="Chargement">Chargement</option>
                  <option value="Embarquement">Embarquement (navire)</option>
                  <option value="Débarquement">Débarquement (navire)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Transporteur *</label>
                <select
                  value={formData.transporteur || ''}
                  onChange={(e) => setFormData({ ...formData, transporteur: e.target.value as any })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="Camion">Camion</option>
                  <option value="Navire">Navire</option>
                  <option value="Train SNCF">Train SNCF</option>
                  <option value="Train Mardyck">Train Mardyck</option>
                </select>
              </div>
            </div>

            {/* Row: Lieu, Zone */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Lieu *</label>
                <select
                  value={formData.lieu || ''}
                  onChange={(e) => setFormData({ ...formData, lieu: e.target.value as any })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="Escaut">Escaut</option>
                  <option value="F12">F12</option>
                  <option value="F13">F13</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Zone *</label>
                <select
                  value={formData.zone || ''}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value as any })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="Parc">Parc</option>
                  <option value="Entrepot">Entrepot</option>
                </select>
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Titre du bug *</label>
              <input
                type="text"
                value={formData.titre || ''}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder="Résumé court du problème"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Interface */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Interface *</label>
              <select
                value={formData.interface || ''}
                onChange={(e) => setFormData({ ...formData, interface: e.target.value as any })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">-- Sélectionner --</option>
                <option value="PdA">PdA</option>
                <option value="PC">PC</option>
                <option value="Tablette">Tablette</option>
              </select>
            </div>

            {/* Module UI */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Module/Zone Interface Utilisateur concernée</label>
              <input
                type="text"
                value={formData.moduleUI || ''}
                onChange={(e) => setFormData({ ...formData, moduleUI: e.target.value })}
                placeholder="Ex: Écran de gestion des stocks, formulaire de saisie..."
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Description détaillée *</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez ce qui ne fonctionne pas normalement..."
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', minHeight: '100px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Étapes */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Étapes pour reproduire le bug</label>
              {(formData.etapes || []).map((etape, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={etape}
                  onChange={(e) => {
                    const newEtapes = [...(formData.etapes || [])];
                    newEtapes[idx] = e.target.value;
                    setFormData({ ...formData, etapes: newEtapes });
                  }}
                  placeholder={`Étape ${idx + 1}`}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box' }}
                />
              ))}
            </div>

            {/* Résultats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Résultat ATTENDU</label>
                <textarea
                  value={formData.resultatAttendu || ''}
                  onChange={(e) => setFormData({ ...formData, resultatAttendu: e.target.value })}
                  placeholder="Ce qui devrait se passer normalement"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Résultat RÉEL (le bug)</label>
                <textarea
                  value={formData.resultatReel || ''}
                  onChange={(e) => setFormData({ ...formData, resultatReel: e.target.value })}
                  placeholder="Ce qui se passe actuellement"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Type de bug */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Type de bug UI</label>
              <select
                value={formData.typeBug || ''}
                onChange={(e) => setFormData({ ...formData, typeBug: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">-- Sélectionner --</option>
                <option value="Élément non visible">Élément non visible ou mal affiché</option>
                <option value="Texte illisible">Texte illisible ou mal formaté</option>
                <option value="Bouton non fonctionnel">Bouton/lien qui ne fonctionne pas</option>
                <option value="Champ bloqué">Champ de formulaire bloqué ou non réactif</option>
                <option value="Décalage">Décalage/alignement des éléments</option>
                <option value="Menu dysfonctionnant">Menu déroulant dysfonctionnant</option>
                <option value="Icône manquante">Icône ou image manquante</option>
                <option value="Message erreur">Message d'erreur confus ou inapproprié</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* Sévérité, Fréquence */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Sévérité *</label>
                <select
                  value={formData.severite || ''}
                  onChange={(e) => setFormData({ ...formData, severite: e.target.value as any })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="Critique">🔴 Critique (empêche l'utilisation)</option>
                  <option value="Majeur">🟠 Majeur (limite la fonctionnalité)</option>
                  <option value="Mineur">🟢 Mineur (problème cosmétique)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Fréquence</label>
                <select
                  value={formData.frequence || ''}
                  onChange={(e) => setFormData({ ...formData, frequence: e.target.value as any })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="À chaque fois">À chaque fois</option>
                  <option value="Souvent">Souvent</option>
                  <option value="Occasionnellement">Occasionnellement</option>
                  <option value="Rare">Rare</option>
                </select>
              </div>
            </div>

            {/* Affecte autres */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Affecte d'autres utilisateurs ?</label>
              <select
                value={formData.affecteAutres || ''}
                onChange={(e) => setFormData({ ...formData, affecteAutres: e.target.value as any })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
                <option value="Incertain">Incertain</option>
              </select>
            </div>

            {/* Observations */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Observations supplémentaires</label>
              <textarea
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Contexte supplémentaire, workarounds..."
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Photos Upload */}
            <div style={{ marginBottom: '20px', backgroundColor: '#f0f7ff', padding: '15px', borderRadius: '4px', border: '2px dashed #0066cc' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>📸 Ajouter des photos (optionnel)</label>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#0066cc' }}>Les photos sont stockées localement dans votre navigateur</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setPhotosToUpload(Array.from(e.target.files || []))}
                style={{ width: '100%', padding: '10px', border: '1px solid #0066cc', borderRadius: '4px', fontSize: '14px' }}
              />
              {photosToUpload.length > 0 && (
                <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#0066cc' }}>
                  ✓ {photosToUpload.length} photo(s) sélectionnée(s)
                </p>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setView('list')}
                disabled={uploadingPhotos}
                style={{ padding: '10px 20px', backgroundColor: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: uploadingPhotos ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: uploadingPhotos ? 0.5 : 1 }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={uploadingPhotos}
                style={{ padding: '10px 20px', backgroundColor: '#92D050', color: 'white', border: 'none', borderRadius: '4px', cursor: uploadingPhotos ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: uploadingPhotos ? 0.5 : 1 }}
              >
                {uploadingPhotos ? '⏳ Upload en cours...' : '✓ Soumettre le rapport'}
              </button>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div>
            {selectedReport ? (
              // DETAIL VIEW
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h2 style={{ margin: '0', color: '#1F4788' }}>{selectedReport.titre}</h2>
                    <span style={{ backgroundColor: getStatusColor(selectedReport.status), color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      {selectedReport.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleCopyToClipboard(selectedReport)} style={{ padding: '8px 12px', backgroundColor: '#e7f3ff', color: '#0066cc', border: '1px solid #0066cc', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      📋 Copier pour Mail
                    </button>
                    {(!selectedReport.closed || isSuperAdmin) && (
                      <button onClick={() => handleRelance(selectedReport.id)} style={{ padding: '8px 12px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffc107', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        ⚡ Prioriser / Relancer
                      </button>
                    )}
                    {isSuperAdmin && (
                      <>
                        <button onClick={() => handleEditClick(selectedReport)} style={{ padding: '8px 12px', backgroundColor: '#f0f0f0', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                          ✏️ Éditer
                        </button>
                        <button onClick={() => handleDeleteReport(selectedReport.id)} style={{ padding: '8px 12px', backgroundColor: '#fee', color: '#c00', border: '1px solid #c00', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                          🗑️ Supprimer
                        </button>
                      </>
                    )}
                  <button
                    onClick={() => setSelectedReport(null)}
                    style={{ padding: '8px 12px', backgroundColor: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    ← Retour
                  </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px' }}>
                  <div><strong>👤 Rapporteur:</strong> {selectedReport.username}</div>
                  <div><strong>📅 Date:</strong> {new Date(selectedReport.timestamp).toLocaleDateString('fr-FR')}</div>
                  <div><strong>⚠️ Sévérité:</strong> <span style={{ color: getSeverityColor(selectedReport.severite), fontWeight: 'bold' }}>{selectedReport.severite}</span></div>
                  <div><strong>🏭 Chantier:</strong> {selectedReport.chantier}</div>
                  <div><strong>🚚 Transporteur:</strong> {selectedReport.transporteur}</div>
                  <div><strong>📍 Lieu:</strong> {selectedReport.lieu}</div>
                  <div><strong>🗂️ Zone:</strong> {selectedReport.zone}</div>
                  <div><strong>🔄 Fréquence:</strong> {selectedReport.frequence}</div>
                  <div><strong>👥 Affecte autres:</strong> {selectedReport.affecteAutres}</div>
                  <div><strong>🐛 Type:</strong> {selectedReport.typeBug}</div>
                </div>

                <div style={{ marginBottom: '20px', borderTop: '2px solid #ddd', paddingTop: '15px' }}>
                  <h3 style={{ color: '#2E5FA8', marginTop: '0' }}>Description du problème</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{selectedReport.description}</p>

                  {selectedReport.moduleUI && (
                    <>
                      <h3 style={{ color: '#2E5FA8' }}>Module/Zone concernée</h3>
                      <p>{selectedReport.moduleUI}</p>
                    </>
                  )}

                  {selectedReport.etapes.some(e => e.trim()) && (
                    <>
                      <h3 style={{ color: '#2E5FA8' }}>Étapes pour reproduire</h3>
                      <ol>{selectedReport.etapes.map((e, i) => e.trim() && <li key={i}>{e}</li>)}</ol>
                    </>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginTop: '15px' }}>
                    {selectedReport.resultatAttendu && (
                      <div style={{ backgroundColor: '#e7f3ff', padding: '12px', borderLeft: '4px solid #0066cc', borderRadius: '4px' }}>
                        <strong>✓ Attendu:</strong>
                        <p style={{ margin: '8px 0 0 0' }}>{selectedReport.resultatAttendu}</p>
                      </div>
                    )}
                    {selectedReport.resultatReel && (
                      <div style={{ backgroundColor: '#ffe7e7', padding: '12px', borderLeft: '4px solid #C00000', borderRadius: '4px' }}>
                        <strong>✗ Réel (bug):</strong>
                        <p style={{ margin: '8px 0 0 0' }}>{selectedReport.resultatReel}</p>
                      </div>
                    )}
                  </div>

                  {selectedReport.observations && (
                    <>
                      <h3 style={{ color: '#2E5FA8' }}>Observations supplémentaires</h3>
                      <p>{selectedReport.observations}</p>
                    </>
                  )}

                  {selectedReport.photos && selectedReport.photos.length > 0 && (
                    <>
                      <h3 style={{ color: '#2E5FA8' }}>📸 Photos</h3>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#999' }}>Cliquez sur une miniature pour l'agrandir</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {selectedReport.photos.map((photoUrl, idx) => (
                          <img
                            key={idx}
                            src={photoUrl}
                            alt={`Photo ${idx + 1}`}
                            title="Cliquer pour agrandir"
                            onClick={() => setModalPhoto(photoUrl)}
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                              cursor: 'pointer',
                              transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Status & History Section */}
                <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <h3 style={{ color: '#2E5FA8', fontSize: '16px' }}>🕒 Historique du traitement</h3>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {selectedReport.statusHistory?.map((h, i) => (
                      <div key={i} style={{ marginBottom: '5px' }}>
                        • <strong>{new Date(h.timestamp).toLocaleString('fr-FR')}</strong> : État passé à <span style={{ color: getStatusColor(h.status.split(' ')[0]) }}>{h.status}</span>
                      </div>
                    ))}
                  </div>

                  {!selectedReport.closed && isAdmin && (
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Changer l'état :</span>
                      {(['déclarer', 'transmis', 'résolus'] as const).map((s) => {
                        const isCurrent = selectedReport.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusUpdate(selectedReport.id, s)}
                            disabled={isCurrent}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: isCurrent ? '#fff' : getStatusColor(s),
                              color: isCurrent ? getStatusColor(s) : 'white',
                              border: `2px solid ${getStatusColor(s)}`,
                              borderRadius: '4px',
                              cursor: isCurrent ? 'default' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '500',
                              opacity: isCurrent ? 0.7 : 1,
                            }}
                          >
                            {s.toUpperCase()}{isCurrent ? ' ✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedReport.closed ? (
                  <div style={{ backgroundColor: '#d4edda', border: '1px solid #28a745', padding: '15px', borderRadius: '4px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#155724' }}>✓ Rapport clôturé</strong>
                      <p style={{ margin: '8px 0 0 0', color: '#155724' }}>Clôturé par <strong>{selectedReport.closedByUser}</strong> ({selectedReport.closedBy}) le {new Date(selectedReport.closedDate || '').toLocaleDateString('fr-FR')}</p>
                    </div>
                    {isSuperAdmin && (
                      <button onClick={() => handleUncloseReport(selectedReport.id)} style={{ padding: '8px 16px', backgroundColor: 'white', color: '#28a745', border: '1px solid #28a745', borderRadius: '4px', cursor: 'pointer' }}>
                        🔓 Déclôturer
                      </button>
                    )}
                  </div>
                ) : isAdmin ? (
                  <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '4px' }}>
                    <strong>Finaliser et Clôturer</strong>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <select
                        value={closeType}
                        onChange={(e) => setCloseType(e.target.value as any)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                      >
                        <option value="support">Signé par Support</option>
                        <option value="direction">Signé par Direction</option>
                      </select>
                      <button
                        onClick={() => handleCloseReport(selectedReport.id)}
                        style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        ✓ Marquer comme Résolu & Clôturer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                    Seuls les administrateurs peuvent clôturer les rapports
                  </div>
                )}
              </div>
            ) : (
              // REPORTS LIST
              <>
                {openReports.length === 0 ? (
                  <div style={{ backgroundColor: 'white', padding: '40px 20px', borderRadius: '8px', textAlign: 'center', color: '#999' }}>
                    <p style={{ fontSize: '16px' }}>Aucun rapport ouvert</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '30px' }}>
                    <h3 style={{ color: '#1F4788', marginTop: '0' }}>🔴 Rapports ouverts ({openReports.length})</h3>
                    {openReports.map(report => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        style={{
                          backgroundColor: 'white',
                          padding: '15px',
                          borderLeft: `4px solid ${getSeverityColor(report.severite)}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)')}
                        onMouseOut={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)')}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#1F4788' }}>{report.titre}</h4>
                            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
                              👤 {report.username} • 📅 {new Date(report.timestamp).toLocaleDateString('fr-FR')} • 🏭 {report.chantier} • 📍 {report.lieu}
                            </p>
                            <p style={{ margin: '0', fontSize: '13px', color: '#999' }}>{report.description.substring(0, 80)}...</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{
                              padding: '6px 12px',
                              backgroundColor: getStatusColor(report.status),
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {report.status?.toUpperCase()}
                            </span>
                            <span style={{
                              padding: '6px 12px',
                              backgroundColor: getSeverityColor(report.severite),
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {report.severite}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {closedReports.length > 0 && (
                  <div>
                    <h3 style={{ color: '#2E5FA8', marginTop: '30px' }}>✓ Rapports clôturés ({closedReports.length})</h3>
                    <div style={{ display: 'grid', gap: '12px', opacity: 0.7 }}>
                      {closedReports.map(report => (
                        <div
                          key={report.id}
                          onClick={() => setSelectedReport(report)}
                          style={{
                            backgroundColor: '#f9f9f9',
                            padding: '15px',
                            borderLeft: '4px solid #28a745',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <h4 style={{ margin: '0 0 8px 0', color: '#28a745', textDecoration: 'line-through' }}>{report.titre}</h4>
                              <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                                Clôturé par {report.closedByUser} ({report.closedBy}) le {new Date(report.closedDate || '').toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px', marginTop: '30px', borderTop: '1px solid #ddd' }}>
        <p style={{ margin: '0' }}>💾 Les données sont sauvegardées sur le Claoud • 📱 Compatible tablette et PC</p>
        {/* <p style={{ margin: '8px 0 0 0' }}>Admin: mAx, ThO</p> */}
      </div>

      {/* Photo Modal */}
      {modalPhoto && (
        <div
          onClick={() => setModalPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setModalPhoto(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#333',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: '40px',
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
          <img
            src={modalPhoto}
            alt="Photo en grand"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              cursor: 'default',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BugReportApp;
