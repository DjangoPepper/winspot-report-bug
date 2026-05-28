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

interface BugReport {
  id: string;
  timestamp: string;
  username: string;
  interface: 'PC' | 'PdA';
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
    typeBug: ''
  });
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [closeType, setCloseType] = useState<'support' | 'direction'>('support');

  const isAdmin = username === 'mAx' || username === 'ThO';

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bugReports');
    const savedUsername = localStorage.getItem('username');
    if (saved) setReports(JSON.parse(saved));
    if (savedUsername) {
      setUsername(savedUsername);
      setUsernameSaved(true);
    }
  }, []);

  // Save to localStorage and GitHub
  useEffect(() => {
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
  }, [reports]);

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    if (newUsername.trim()) {
      localStorage.setItem('username', newUsername);
      setUsernameSaved(true);
    }
  };

  const handleSubmitReport = () => {
    if (!usernameSaved || !formData.titre || !formData.description) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newReport: BugReport = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
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
      closed: false
    };

    setReports([newReport, ...reports]);
    
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

    setView('list');
  };

  const handleCloseReport = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      const updated = reports.map(r =>
        r.id === reportId
          ? {
              ...r,
              closed: true,
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

  const openReports = reports.filter(r => !r.closed);
  const closedReports = reports.filter(r => r.closed);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '0' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1F4788', color: 'white', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>🏭 Rapport de Bugs - Stockage Métallurgique</h1>
        <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>Interface pour déclarer et suivre les dysfonctionnements</p>
      </div>

      {/* Username Bar */}
      {!usernameSaved ? (
        <div style={{ backgroundColor: '#fff3cd', padding: '15px 20px', borderBottom: '1px solid #ffc107', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: '#856404' }}>👤 Entrez votre prénom:</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ex: freddy, jerem, romu..."
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

      {/* Navigation */}
      <div style={{ backgroundColor: 'white', padding: '15px 20px', borderBottom: '1px solid #ddd', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setView('list')}
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
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* FORM VIEW */}
        {view === 'form' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: '0', color: '#1F4788' }}>Déclarer un nouveau bug</h2>

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
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Module/Zone UI concernée</label>
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

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setView('list')}
                style={{ padding: '10px 20px', backgroundColor: '#f0f0f0', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitReport}
                style={{ padding: '10px 20px', backgroundColor: '#92D050', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
              >
                ✓ Soumettre le rapport
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: '0', color: '#1F4788' }}>{selectedReport.titre}</h2>
                  <button
                    onClick={() => setSelectedReport(null)}
                    style={{ padding: '8px 12px', backgroundColor: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    ← Retour
                  </button>
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
                </div>

                {selectedReport.closed ? (
                  <div style={{ backgroundColor: '#d4edda', border: '1px solid #28a745', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                    <strong style={{ color: '#155724' }}>✓ Rapport clôturé</strong>
                    <p style={{ margin: '8px 0 0 0', color: '#155724' }}>Clôturé par <strong>{selectedReport.closedByUser}</strong> ({selectedReport.closedBy}) le {new Date(selectedReport.closedDate || '').toLocaleDateString('fr-FR')}</p>
                  </div>
                ) : isAdmin ? (
                  <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '4px' }}>
                    <strong>Clôturer ce rapport</strong>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <select
                        value={closeType}
                        onChange={(e) => setCloseType(e.target.value as any)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                      >
                        <option value="support">Support</option>
                        <option value="direction">Direction</option>
                      </select>
                      <button
                        onClick={() => handleCloseReport(selectedReport.id)}
                        style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        Clôturer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                    Seuls les administrateurs (mAx, ThO) peuvent clôturer les rapports
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
        <p style={{ margin: '0' }}>💾 Les données sont sauvegardées localement • 📱 Compatible tablette et PC</p>
        <p style={{ margin: '8px 0 0 0' }}>Admin: mAx, ThO</p>
      </div>
    </div>
  );
};

export default BugReportApp;
