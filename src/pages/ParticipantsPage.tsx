import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Edit,
  Trash2,
  User,
  Mail,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
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

  useEffect(() => {
    fetchParticipants();
    fetchEntries();
  }, []);

  // Calculer les khatmas réels basés sur les entrées
  const participantKhatmas = useMemo(() => {
    const khatmasMap = new Map<string, number>();
    participants.forEach(p => {
      const weeklyDeltas = calculateWeeklyDeltas(entries, p.id);
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
      const headers = rows[0];
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Participants</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez les participants et leur progression
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </button>
          <button
            onClick={createDemoParticipants}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <User className="h-4 w-4 mr-2" />
            Démo (16)
          </button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          {/* Import/Export */}
          <div className="flex gap-2">
            <label className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={importCSV}
                className="hidden"
              />
            </label>
            <button
              onClick={exportCSV}
              className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading.participants ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucun participant trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cycles
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {participant.avatar_url ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={participant.avatar_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {participant.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Objectif: {participant.weekly_target_hizb || 7} hizb/semaine
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        {participant.email ? (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            {participant.email}
                          </>
                        ) : (
                          <span className="text-gray-400">Aucun email</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(participant)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          participant.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {participant.active ? (
                          <ToggleRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ToggleLeft className="h-3 w-3 mr-1" />
                        )}
                        {participant.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {participantKhatmas.get(participant.id) || 0} khatma{(participantKhatmas.get(participant.id) || 0) > 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(participant)}
                          className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(participant.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingParticipant ? 'Modifier le participant' : 'Ajouter un participant'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL Avatar
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Objectif hebdomadaire
                </label>
                <select
                  value={formData.weekly_target_hizb}
                  onChange={(e) => setFormData({ ...formData, weekly_target_hizb: Number(e.target.value) as 7 | 14 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value={7}>7 hizb / semaine</option>
                  <option value={14}>14 hizb / semaine</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Participant actif
                </label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingParticipant(null);
                    setFormData({ name: '', email: '', avatar_url: '', active: true, weekly_target_hizb: 7 });
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                >
                  {editingParticipant ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {participants.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total participants</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {participants.filter(p => p.active).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Participants actifs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {Array.from(participantKhatmas.values()).reduce((sum, k) => sum + k, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total khatmas</div>
        </div>
      </div>
    </div>
  );
}