import React, { useState, useEffect } from 'react';
import {
  Plus,
  Users,
  Crown,
  Shield,
  Eye,
  Copy,
  Mail,
  Settings,
  UserPlus,
  Trash2,
  ExternalLink,
  UserMinus
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { Group, GroupMember } from '../types';

export default function GroupsPage() {
  const navigate = useNavigate();
  const {
    groups,
    groupMembers,
    currentUserRole,
    activeGroupId,
    userProfile,
    user,
    fetchMyGroups,
    createGroup,
    deleteGroup,
    fetchGroupMembers,
    inviteByEmail,
    setActiveGroup,
    fetchUserProfile,
    updateUserProfile,
    updateMemberRole,
    removeMember,
    loading
  } = useAppStore();

  const { success, error: showError } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member' | 'viewer'>('member');
  const [joinCode, setJoinCode] = useState('');
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [groupRoles, setGroupRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMyGroups();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchGroupRoles = async () => {
      if (!user?.id || groups.length === 0) return;

      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      if (!error && data) {
        const roles: Record<string, string> = {};
        data.forEach(member => {
          roles[member.group_id] = member.role;
        });
        setGroupRoles(roles);
      }
    };

    fetchGroupRoles();
  }, [groups, user]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupMembers(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (userProfile?.display_name) {
      setParticipantName(userProfile.display_name);
    }
  }, [userProfile]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const group = await createGroup(newGroupName.trim());
      setActiveGroup(group.id);
      setShowCreateModal(false);
      setNewGroupName('');
      success('Groupe créé avec succès');
    } catch (error) {
      console.error('Error creating group:', error);
      showError('Erreur lors de la création du groupe');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !inviteEmail.trim()) return;

    try {
      const code = await inviteByEmail(selectedGroupId, inviteEmail.trim(), inviteRole);
      setJoinCode(code);
      setInviteEmail('');
      success('Invitation créée avec succès');
    } catch (error) {
      console.error('Error sending invite:', error);
      showError('Erreur lors de l\'envoi de l\'invitation');
    }
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    success('Code copié dans le presse-papiers !');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'manager': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member': return <Users className="h-4 w-4 text-green-500" />;
      case 'viewer': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'manager': return 'Gestionnaire';
      case 'member': return 'Membre';
      case 'viewer': return 'Observateur';
      default: return role;
    }
  };

  const canManageGroup = (group: Group) => {
    const role = groupRoles[group.id];
    return role && ['owner', 'manager'].includes(role);
  };

  const canDeleteGroup = (group: Group) => {
    const role = groupRoles[group.id];
    return role === 'owner';
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;

    try {
      await deleteGroup(selectedGroupId);
      success('Groupe supprimé avec succès');
      setShowDeleteModal(false);
      setSelectedGroupId(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      showError('Erreur lors de la suppression du groupe');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinGroupCode.trim() || !participantName.trim()) return;

    try {
      // Update participant name if changed
      if (participantName !== userProfile?.display_name) {
        await updateUserProfile({ display_name: participantName });
      }

      // Try to find group by invite code (case-sensitive)
      console.log('Searching for invite code:', joinGroupCode);
      console.log('Current time:', new Date().toISOString());

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', joinGroupCode)
        .gt('invite_code_expires_at', new Date().toISOString())
        .maybeSingle();

      console.log('Group found:', group);
      console.log('Group error:', groupError);

      if (groupError) throw groupError;

      if (!group) {
        showError('Code d\'invitation invalide ou expiré');
        return;
      }

      // Join group using secure RPC function
      const { data: userData } = await supabase.auth.getUser();

      const { data: joinResult, error: joinError } = await supabase.rpc('join_group_with_invite_code', {
        p_invite_code: joinGroupCode.trim(),
        p_user_id: userData.user?.id
      });

      if (joinError) throw joinError;

      if (!joinResult.success) {
        showError(joinResult.error);
        return;
      }

      success('Vous avez rejoint le groupe avec succès !');
      setShowJoinModal(false);
      setJoinGroupCode('');
      await fetchMyGroups();
      setActiveGroup(joinResult.group_id);
    } catch (error: any) {
      console.error('Error joining group:', error);
      showError('Erreur lors de la tentative de rejoindre le groupe');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes groupes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez vos groupes de lecture du Coran
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Rejoindre un groupe
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un groupe
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {loading.groups ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun groupe
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Créez votre premier groupe pour commencer
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un groupe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`bg-white dark:bg-gray-800 rounded-lg p-6 border-2 transition-all cursor-pointer ${
                group.id === activeGroupId
                  ? 'border-emerald-500 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
              }`}
              onClick={() => setActiveGroup(group.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {group.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Créé le {new Date(group.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {group.id === activeGroupId && (
                  <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded text-xs font-medium">
                    Actif
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getRoleIcon(groupRoles[group.id] || '')}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {getRoleLabel(groupRoles[group.id] || '')}
                  </span>
                </div>

                {/* Invite Code Display */}
                {group.invite_code && new Date(group.invite_code_expires_at) > new Date() && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">Code d'invitation</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-emerald-900 dark:text-emerald-100">
                        {group.invite_code}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(group.invite_code);
                          success('Code copié !');
                        }}
                        className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {canManageGroup(group) && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGroup(group.id);
                          navigate('/group-settings');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Réglages
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroupId(group.id);
                          setShowInviteModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-sm"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Inviter
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroupId(group.id);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Membres
                  </button>
                  {canDeleteGroup(group) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroupId(group.id);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members Modal */}
      {selectedGroupId && !showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Membres du groupe
              </h2>
              <button
                onClick={() => setSelectedGroupId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {loading.groupMembers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {groupMembers.map((member) => {
                  const selectedGroup = groups.find(g => g.id === selectedGroupId);
                  const currentRole = groupRoles[selectedGroupId];
                  const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager';
                  const isCurrentUser = member.user_id === user?.id;
                  const isMemberOwner = member.role === 'owner';
                  const canModify = isOwnerOrManager && !isCurrentUser && !isMemberOwner;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {member.user_profile?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.user_profile?.full_name || 'Utilisateur'}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(vous)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Membre depuis {new Date(member.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {canModify ? (
                          <select
                            value={member.role}
                            onChange={async (e) => {
                              const newRole = e.target.value as 'manager' | 'member' | 'viewer';
                              try {
                                await updateMemberRole(selectedGroupId, member.user_id, newRole, member.can_write_self);
                                success('Rôle mis à jour avec succès');
                              } catch (error) {
                                console.error('Error updating role:', error);
                                showError('Erreur lors de la mise à jour du rôle');
                              }
                            }}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="manager">Gestionnaire</option>
                            <option value="member">Membre</option>
                            <option value="viewer">Observateur</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {getRoleLabel(member.role)}
                            </span>
                          </div>
                        )}

                        {member.can_write_self && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                            Écriture
                          </span>
                        )}

                        {canModify && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Êtes-vous sûr de vouloir retirer ${member.user_profile?.full_name || 'cet utilisateur'} du groupe ?`)) {
                                return;
                              }
                              try {
                                await removeMember(selectedGroupId, member.user_id);
                                success('Membre retiré avec succès');
                              } catch (error) {
                                console.error('Error removing member:', error);
                                showError('Erreur lors de la suppression du membre');
                              }
                            }}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Retirer du groupe"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Créer un nouveau groupe
            </h2>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du groupe
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ex: Groupe du mardi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewGroupName('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Inviter un membre
            </h2>
            
            {joinCode ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                    Invitation créée ! Partagez ce code :
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border rounded font-mono text-sm">
                      {joinCode}
                    </code>
                    <button
                      onClick={copyJoinCode}
                      className="p-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setJoinCode('');
                    setSelectedGroupId(null);
                  }}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rôle
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="member">Membre</option>
                    <option value="manager">Gestionnaire</option>
                    <option value="viewer">Observateur</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail('');
                      setSelectedGroupId(null);
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Inviter
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Supprimer le groupe
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible et supprimera toutes les données associées (participants, saisies, etc.).
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedGroupId(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteGroup}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rejoindre un groupe
            </h2>

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code d'invitation
                </label>
                <input
                  type="text"
                  required
                  value={joinGroupCode}
                  onChange={(e) => setJoinGroupCode(e.target.value)}
                  placeholder="Veuillez saisir votre code d'invitation"
                  maxLength={15}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Entrez le code d'invitation à 15 caractères
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de participant
                </label>
                <input
                  type="text"
                  required
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Follower-Rapide"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ce nom sera visible par les autres membres du groupe
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinGroupCode('');
                    setParticipantName(userProfile?.display_name || '');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Rejoindre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}