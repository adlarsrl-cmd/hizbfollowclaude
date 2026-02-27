import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Upload,
  Download,
  Edit,
  Trash2,
  User,
  ToggleRight,
  Target,
  Loader2,
  Link2,
  Copy,
  UserX
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../stores/useToast';
import { useAppStore } from '../stores/useAppStore';
import { toCSV, parseCSV, calculateWeeklyDeltas } from '../lib/utils';
import type { Participant } from '../types';

export default function ParticipantsPage() {
  const {
    participants,
    entries,
    fetchParticipants,
    fetchEntries,
    addParticipant,
    updateParticipant,
    deleteParticipant,
    loading
  } = useAppStore();

  const { success, error: showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar_url: '',
    active: true,
    weekly_target_hizb: 7 as 7 | 14
  });

  // Linking state
  const [linkingParticipant, setLinkingParticipant] = useState<Participant | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    fetchParticipants();
    fetchEntries();
  }, []);

  // Calculer les khatmas réels basés sur les entrées
  const participantKhatmas = useMemo(() => {
    const khatmasMap = new Map<string, number>();
    participants.forEach(p => {
      const weeklyDeltas = calculateWeeklyDeltas(entries, p.id, p.user_id);
      const totalHizb = weeklyDeltas.reduce((sum, w) => sum + w.delta, 0);
      const khatmas = Math.floor(totalHizb / 60);
      khatmasMap.set(p.id, khatmas);
    });
    return khatmasMap;
  }, [participants, entries]);

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (participant.email && participant.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterActive === 'all' || 
                         (filterActive === 'active' && participant.active) ||
                         (filterActive === 'inactive' && !participant.active);

    return matchesSearch && matchesFilter;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingParticipant) {
        await updateParticipant(editingParticipant.id, formData);
      } else {
        await addParticipant({
          ...formData,
          cycle_number: 0,
          weekly_target_hizb: formData.weekly_target_hizb
        });
      }
      
      setShowModal(false);
      setEditingParticipant(null);
      setFormData({ name: '', email: '', avatar_url: '', active: true, weekly_target_hizb: 7 });
    } catch (error) {
      console.error('Error saving participant:', error);
    }
  };

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setFormData({
      name: participant.name,
      email: participant.email || '',
      avatar_url: participant.avatar_url || '',
      active: participant.active,
      weekly_target_hizb: participant.weekly_target_hizb || 7
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) {
      try {
        await deleteParticipant(id);
      } catch (error) {
        console.error('Error deleting participant:', error);
      }
    }
  };

  const handleGenerateLink = async (participant: Participant) => {
    setLinkingParticipant(participant);
    setGeneratedLink('');
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase.rpc('generate_participant_link', {
        p_participant_id: participant.id
      });
      if (error || !(data as any)?.success) {
        showError((data as any)?.error || error?.message || 'Erreur lors de la génération');
        setLinkingParticipant(null);
      } else {
        const token = (data as any).token as string;
        setGeneratedLink(`${window.location.origin}/link-account?token=${token}`);
      }
    } catch (err: any) {
      showError(err.message || 'Erreur inconnue');
      setLinkingParticipant(null);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    success('Lien copié !');
  };

  const toggleActive = async (participant: Participant) => {
    try {
      await updateParticipant(participant.id, { active: !participant.active });
    } catch (error) {
      console.error('Error toggling participant status:', error);
    }
  };

  const exportCSV = () => {
    const data = participants.map(p => ({
      name: p.name,
      email: p.email || '',
      active: p.active,
      avatar_url: p.avatar_url || '',
      cycle_number: p.cycle_number
    }));
    
    const csv = toCSV(data, ['name', 'email', 'active', 'avatar_url', 'cycle_number']);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `participants-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      // const headers = rows[0];
      const dataRows = rows.slice(1);

      for (const row of dataRows) {
        const participant = {
          name: row[0] || '',
          email: row[1] || undefined,
          active: row[2] === 'true',
          avatar_url: row[3] || undefined,
          cycle_number: parseInt(row[4]) || 0
        };

        if (participant.name) {
          try {
            await addParticipant(participant);
          } catch (error) {
            console.error('Error importing participant:', error);
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const createDemoParticipants = async () => {
    const demoNames = [
      'Adam', 'Sarah', 'David', 'Emma',
      'Michael', 'Sophia', 'James', 'Olivia',
      'Robert', 'Isabella', 'William', 'Ava',
      'Benjamin', 'Charlotte', 'Alexander', 'Mia'
    ];

    for (let i = 0; i < demoNames.length; i++) {
      try {
        await addParticipant({
          name: demoNames[i],
          email: `participant${i + 1}@hizbfollow.com`,
          active: Math.random() > 0.1, // 90% active
          cycle_number: Math.floor(Math.random() * 3) // 0-2 cycles completed
        });
      } catch (error) {
        console.error('Error creating demo participant:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Participants</h3>
             <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
               <User className="h-4 w-4" />
             </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{participants.length}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Actifs</h3>
             <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
               <ToggleRight className="h-4 w-4" />
             </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{participants.filter(p => p.active).length}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Khatmas</h3>
             <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
               <Target className="h-4 w-4" />
             </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {Array.from(participantKhatmas.values()).reduce((sum, k) => sum + k, 0)}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-modern pl-10"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl p-1">
              <button
                onClick={() => setFilterActive('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterActive === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterActive('active')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterActive === 'active' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Actifs
              </button>
              <button
                onClick={() => setFilterActive('inactive')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterActive === 'inactive' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Inactifs
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden lg:block" />

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 whitespace-nowrap font-medium text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau
            </button>

            <div className="flex gap-2">
              <label className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors" title="Import CSV">
                <Upload className="h-5 w-5" />
                <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
              </label>
              <button
                onClick={exportCSV}
                className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Export CSV"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={createDemoParticipants}
                className="p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Demo Data"
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading.participants ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin h-10 w-10 text-emerald-600" />
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-8 text-center">
               <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Search className="h-6 w-6 text-slate-400" />
               </div>
               <p className="text-slate-500 dark:text-slate-400">Aucun participant trouvé</p>
            </div>
          ) : (
            filteredParticipants.map((participant) => (
              <div key={participant.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
                      {participant.avatar_url ? (
                        <img src={participant.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        participant.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-900 dark:text-white">{participant.name}</span>
                        {!participant.user_id && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs">
                            <UserX className="w-3 h-3" /> ghost
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{participant.email || 'Sans email'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!participant.user_id && (
                      <button
                        onClick={() => handleGenerateLink(participant)}
                        className="p-2 text-slate-400 hover:text-violet-600 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        title="Lier un compte"
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(participant)}
                      className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(participant.id)}
                      className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                     <span className="text-xs text-slate-500 block">Statut</span>
                     <button
                        onClick={() => toggleActive(participant)}
                        className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          participant.active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {participant.active ? 'Actif' : 'Inactif'}
                      </button>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                     <span className="text-xs text-slate-500 block">Objectif</span>
                     <div className="mt-1 font-medium text-slate-700 dark:text-slate-300">
                       {participant.weekly_target_hizb || 7} hizb
                     </div>
                   </div>
                   <div className="col-span-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg flex justify-between items-center">
                     <span className="text-xs text-slate-500">Performance</span>
                     <span className="font-medium text-slate-900 dark:text-white">
                       {participantKhatmas.get(participant.id) || 0} khatmas
                     </span>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          {loading.participants ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin h-10 w-10 text-emerald-600" />
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Aucun participant</h3>
              <p className="text-slate-500 dark:text-slate-400">Essayez de modifier vos filtres ou ajoutez un nouveau participant.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Participant</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Objectif</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Performance</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm">
                          {participant.avatar_url ? (
                            <img src={participant.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            participant.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900 dark:text-white">{participant.name}</span>
                            {!participant.user_id && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs">
                                <UserX className="w-3 h-3" /> ghost
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{participant.email || 'Sans email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <button
                        onClick={() => toggleActive(participant)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          participant.active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {participant.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center text-slate-600 dark:text-slate-300 text-sm">
                         <Target className="w-4 h-4 mr-2 text-slate-400" />
                         {participant.weekly_target_hizb || 7} hizb
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">{participantKhatmas.get(participant.id) || 0}</span> khatmas
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!participant.user_id && (
                          <button
                            onClick={() => handleGenerateLink(participant)}
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                            title="Lier un compte"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(participant)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(participant.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingParticipant ? 'Modifier le participant' : 'Nouveau participant'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="ex: Mohamed Ali"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="email@exemple.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  URL Avatar
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Objectif hebdomadaire
                </label>
                <select
                  value={formData.weekly_target_hizb}
                  onChange={(e) => setFormData({ ...formData, weekly_target_hizb: Number(e.target.value) as 7 | 14 })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                >
                  <option value={7}>7 hizb / semaine (Standard)</option>
                  <option value={14}>14 hizb / semaine (Intensif)</option>
                </select>
              </div>
              
              <label className="flex items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded-md"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">Compte Actif</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Ce participant apparaîtra dans les rapports</span>
                </div>
              </label>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingParticipant(null);
                    setFormData({ name: '', email: '', avatar_url: '', active: true, weekly_target_hizb: 7 });
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {editingParticipant ? 'Enregistrer' : 'Créer le participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Lier un compte */}
      {linkingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lier un compte</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{linkingParticipant.name}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {generatingLink ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-7 w-7 border-2 border-violet-600 border-t-transparent rounded-full" />
                </div>
              ) : generatedLink ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Envoyez ce lien au participant. Une fois connecté, il pourra revendiquer son historique.
                  </p>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <code className="flex-1 text-xs text-slate-700 dark:text-slate-300 break-all font-mono">
                      {generatedLink}
                    </code>
                    <button
                      onClick={copyLink}
                      className="flex-shrink-0 p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Ce lien est à usage unique et expire si inutilisé.
                  </p>
                </>
              ) : null}

              <button
                onClick={() => { setLinkingParticipant(null); setGeneratedLink(''); }}
                className="w-full py-3 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
