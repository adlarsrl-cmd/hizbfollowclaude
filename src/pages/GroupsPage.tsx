import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Users,
  Crown,
  Shield,
  Eye,
  Copy,
  Settings,
  UserPlus,
  Trash2,
  ExternalLink,
  UserMinus,
  ChevronRight,
  X,
  UserX
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { getWeekKeyTuesday, parseWeekKeyTuesday } from '../lib/utils';
import type { Group, Participant } from '../types';

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':   return <Crown className="h-4 w-4 text-amber-500" />;
    case 'manager': return <Shield className="h-4 w-4 text-blue-500" />;
    case 'member':  return <Users className="h-4 w-4 text-emerald-500" />;
    case 'viewer':  return <Eye className="h-4 w-4 text-slate-400" />;
    default:        return null;
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'owner':   return 'Propriétaire';
    case 'manager': return 'Gestionnaire';
    case 'member':  return 'Membre';
    case 'viewer':  return 'Observateur';
    default:        return role;
  }
}

const Suspense = ({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) => (
  <React.Suspense fallback={fallback}>{children}</React.Suspense>
);

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

  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [showInviteModal, setShowInviteModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [showJoinModal, setShowJoinModal]       = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showGroupSheet, setShowGroupSheet]     = useState(false);

  const [selectedGroupId, setSelectedGroupId]  = useState<string | null>(null);
  const [newGroupName, setNewGroupName]         = useState('');
  const [inviteEmail, setInviteEmail]           = useState('');
  const [inviteRole, setInviteRole]             = useState<'manager' | 'member' | 'viewer'>('member');
  const [joinCode, setJoinCode]                 = useState('');
  const [joinGroupCode, setJoinGroupCode]       = useState('');
  const [participantName, setParticipantName]   = useState('');
  const [groupRoles, setGroupRoles]             = useState<Record<string, string>>({});

  // All participants for the selected group (used in Members modal)
  const [allParticipants, setAllParticipants]   = useState<Participant[]>([]);
  const [loadingAllParts, setLoadingAllParts]   = useState(false);

  // Admin entry sheet state
  const [showAdminEntrySheet, setShowAdminEntrySheet] = useState(false);
  const [adminEntryTarget, setAdminEntryTarget] = useState<{
    participantId: string;
    name: string;
    user_id?: string | null;
    cycle_number: number;
  } | null>(null);
  const [adminEntryValue, setAdminEntryValue]           = useState(1);
  const [adminEntrySaving, setAdminEntrySaving]         = useState(false);
  const [adminEntryLoading, setAdminEntryLoading]       = useState(false);
  const [adminEntryWeekOffset, setAdminEntryWeekOffset] = useState(0); // 0 = current week, -7 = last week, etc.
  const [adminEntryType, setAdminEntryType]             = useState<'normal' | 'restart' | 'starting_point'>('normal');

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
        data.forEach(m => { roles[m.group_id] = m.role; });
        setGroupRoles(roles);
      }
    };
    fetchGroupRoles();
  }, [groups, user]);

  useEffect(() => {
    if (selectedGroupId && showMembersModal) {
      fetchGroupMembers(selectedGroupId);
      // Also load all participants (real + ghosts) for entry feature
      setLoadingAllParts(true);
      supabase
        .from('participants')
        .select('*')
        .eq('group_id', selectedGroupId)
        .eq('active', true)
        .then(({ data }) => {
          setAllParticipants(data || []);
          setLoadingAllParts(false);
        });
    } else {
      setAllParticipants([]);
    }
  }, [selectedGroupId, showMembersModal]);

  useEffect(() => {
    if (userProfile?.display_name) setParticipantName(userProfile.display_name);
  }, [userProfile]);

  const canManageGroup = (g: Group) => ['owner', 'manager'].includes(groupRoles[g.id] || '');
  const canDeleteGroup = (g: Group) => groupRoles[g.id] === 'owner';

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const group = await createGroup(newGroupName.trim());
      await setActiveGroup(group.id);
      setShowCreateModal(false);
      setNewGroupName('');
      success('Groupe créé avec succès');
    } catch {
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
    } catch {
      showError("Erreur lors de l'envoi de l'invitation");
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    try {
      await deleteGroup(selectedGroupId);
      success('Groupe supprimé');
      setShowDeleteModal(false);
      setSelectedGroupId(null);
    } catch {
      showError('Erreur lors de la suppression');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinGroupCode.trim() || !participantName.trim()) return;
    try {
      if (participantName !== userProfile?.display_name) {
        await updateUserProfile({ display_name: participantName });
      }
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', joinGroupCode)
        .gt('invite_code_expires_at', new Date().toISOString())
        .maybeSingle();
      if (groupError) throw groupError;
      if (!group) { showError("Code d'invitation invalide ou expiré"); return; }

      const { data: userData } = await supabase.auth.getUser();
      const { data: joinResult, error: joinError } = await supabase.rpc('join_group_with_invite_code', {
        p_invite_code: joinGroupCode.trim(),
        p_user_id: userData.user?.id
      });
      if (joinError) throw joinError;
      if (!joinResult.success) { showError(joinResult.error); return; }

      success('Vous avez rejoint le groupe !');
      setShowJoinModal(false);
      setJoinGroupCode('');
      await fetchMyGroups();
      await setActiveGroup(joinResult.group_id);
    } catch {
      showError('Erreur lors de la tentative de rejoindre le groupe');
    }
  };

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowInviteModal(false);
    setShowDeleteModal(false);
    setShowJoinModal(false);
    setShowMembersModal(false);
    setShowGroupSheet(false);
    setShowAdminEntrySheet(false);
    setAdminEntryTarget(null);
    setAdminEntryWeekOffset(0);
    setAdminEntryType('normal');
    setAdminEntryLoading(false);
    setAllParticipants([]);
    setSelectedGroupId(null);
    setJoinCode('');
  };

  const fetchAdminEntryForWeek = async (offset: number, participantId: string, userId?: string | null, groupId?: string | null) => {
    if (!groupId) return;
    setAdminEntryLoading(true);
    try {
      let query = supabase
        .from('entries')
        .select('value_int')
        .eq('group_id', groupId)
        .neq('source', 'starting_point');

      if (userId) {
        query = query.or(`participant_id.eq.${participantId},user_id.eq.${userId}`);
      } else {
        query = query.eq('participant_id', participantId);
      }

      if (offset !== 0) {
        const anchor = new Date();
        anchor.setDate(anchor.getDate() + offset);
        const wk = getWeekKeyTuesday(anchor);
        const tue = parseWeekKeyTuesday(wk);
        const nextTue = new Date(tue);
        nextTue.setDate(tue.getDate() + 7);
        query = query
          .gte('recorded_at', tue.toISOString())
          .lt('recorded_at', nextTue.toISOString());
      }

      const { data } = await query.order('recorded_at', { ascending: false }).limit(1);
      setAdminEntryValue(data?.[0]?.value_int ?? 1);
    } finally {
      setAdminEntryLoading(false);
    }
  };

  const openAdminEntry = (participantId: string, name: string, userId?: string | null, cycleNumber?: number) => {
    setAdminEntryTarget({ participantId, name, user_id: userId, cycle_number: cycleNumber || 0 });
    setAdminEntryWeekOffset(0);
    setAdminEntryType('normal');
    setShowAdminEntrySheet(true);
    fetchAdminEntryForWeek(0, participantId, userId, selectedGroupId);
  };

  const handleAdminEntry = async () => {
    if (!adminEntryTarget || !selectedGroupId || !user?.id) return;
    setAdminEntrySaving(true);
    try {
      // Determine recorded_at from week offset
      let recordedAt: string;
      if (adminEntryWeekOffset === 0) {
        recordedAt = new Date().toISOString();
      } else {
        const anchor = new Date();
        anchor.setDate(anchor.getDate() + adminEntryWeekOffset);
        const weekKey = getWeekKeyTuesday(anchor);
        const tue = parseWeekKeyTuesday(weekKey);
        const mon = new Date(tue);
        mon.setDate(mon.getDate() + 6);
        mon.setHours(23, 59, 59, 999);
        recordedAt = mon.toISOString();
      }

      const cycleNumber = adminEntryType === 'restart'
        ? (adminEntryTarget.cycle_number || 0) + 1
        : (adminEntryTarget.cycle_number || 0);

      // Upsert: supprimer l'entrée existante du même jour pour ce participant/groupe
      const targetDate = new Date(recordedAt);
      const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);
      let delQuery = supabase.from('entries').delete()
        .eq('group_id', selectedGroupId)
        .neq('source', 'starting_point')
        .gte('recorded_at', dayStart.toISOString())
        .lte('recorded_at', dayEnd.toISOString());
      if (adminEntryTarget.user_id) {
        delQuery = delQuery.eq('user_id', adminEntryTarget.user_id);
      } else {
        delQuery = delQuery.eq('participant_id', adminEntryTarget.participantId);
      }
      await delQuery;

      const { error } = await supabase.from('entries').insert({
        participant_id: adminEntryTarget.participantId,
        user_id: adminEntryTarget.user_id || null,
        group_id: selectedGroupId,
        owner_id: user.id,
        unit_type: 'hizb',
        value_int: adminEntryValue,
        cycle_number: cycleNumber,
        source: adminEntryType === 'starting_point' ? 'starting_point' : 'manual',
        is_restart: adminEntryType === 'restart',
        recorded_at: recordedAt,
      });
      if (error) throw error;
      success(`Saisie enregistrée pour ${adminEntryTarget.name}`);
      setShowAdminEntrySheet(false);
      setAdminEntryTarget(null);
    } catch {
      showError('Erreur lors de la saisie');
    } finally {
      setAdminEntrySaving(false);
    }
  };

  const openGroupSheet = (groupId: string) => {
    setSelectedGroupId(groupId);
    setShowGroupSheet(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Groupes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gérez vos groupes de lecture
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Rejoindre
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            Créer
          </button>
        </div>
      </div>

      {/* Participants shortcut (owner/manager) */}
      {(currentUserRole === 'owner' || currentUserRole === 'manager') && activeGroupId && (
        <Link
          to="/participants"
          className="flex items-center gap-3 p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Gérer les participants</p>
            <p className="text-xs opacity-70">Ajouter des ghosts, lier des comptes, gérer les objectifs</p>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </Link>
      )}

      {/* Groups list */}
      {loading.groups ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Aucun groupe</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
            Créez votre premier groupe ou rejoignez-en un avec un code d'invitation.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            Créer un groupe
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const role = groupRoles[group.id];
            const isActive = group.id === activeGroupId;
            return (
              <div
                key={group.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all p-5 ${
                  isActive
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {/* Group header */}
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                    onClick={() => setActiveGroup(group.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                      isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{group.name}</p>
                        {isActive && (
                          <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg">
                            Actif
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {getRoleIcon(role || '')}
                        {getRoleLabel(role || '')}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => openGroupSheet(group.id)}
                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Members Modal ── */}
      {showMembersModal && selectedGroupId && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Membres du groupe</h2>
              <button onClick={closeAllModals} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Real members */}
              {loading.groupMembers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {groupMembers.map((member) => {
                    const callerRole = groupRoles[selectedGroupId];
                    const isOwnerOrManager = ['owner', 'manager'].includes(callerRole || '');
                    const isCurrentUser = member.user_id === user?.id;
                    const isMemberOwner = member.role === 'owner';
                    const canModify = isOwnerOrManager && !isCurrentUser && !isMemberOwner;
                    const memberParticipant = allParticipants.find(p => p.user_id === member.user_id);

                    return (
                      <div key={member.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm flex-shrink-0">
                            {member.user_profile?.display_name?.charAt(0) || member.user_profile?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {member.user_profile?.display_name || member.user_profile?.full_name || 'Utilisateur'}
                              {isCurrentUser && <span className="ml-1.5 text-xs text-slate-400">(vous)</span>}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              {getRoleIcon(member.role)}
                              {getRoleLabel(member.role)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Entry button for admin/manager */}
                          {isOwnerOrManager && memberParticipant && (
                            <button
                              onClick={() => openAdminEntry(memberParticipant.id, member.user_profile?.display_name || member.user_profile?.full_name || 'Membre', member.user_id, memberParticipant.cycle_number)}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="Saisir une lecture"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                          {canModify && (
                            <>
                              <select
                                value={member.role}
                                onChange={async (e) => {
                                  try {
                                    await updateMemberRole(selectedGroupId, member.user_id, e.target.value as any, member.can_write_self);
                                    success('Rôle mis à jour');
                                  } catch { showError('Erreur lors de la mise à jour'); }
                                }}
                                className="text-xs px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                              >
                                <option value="manager">Gestionnaire</option>
                                <option value="member">Membre</option>
                                <option value="viewer">Observateur</option>
                              </select>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Retirer ${member.user_profile?.display_name || 'cet utilisateur'} ?`)) return;
                                  try { await removeMember(selectedGroupId, member.user_id); success('Membre retiré'); }
                                  catch { showError('Erreur lors de la suppression'); }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ghost participants */}
              {(() => {
                const ghosts = allParticipants.filter(p => !p.user_id);
                const callerRole = groupRoles[selectedGroupId];
                const isOwnerOrManager = ['owner', 'manager'].includes(callerRole || '');
                if (!loadingAllParts && ghosts.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-1 mb-2">
                      Participants fantômes
                    </p>
                    {loadingAllParts ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ghosts.map((ghost) => (
                          <div key={ghost.id} className="flex items-center justify-between gap-3 p-3 bg-violet-50 dark:bg-violet-900/10 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                <UserX className="w-4 h-4 text-violet-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {ghost.name}
                                </div>
                                <div className="text-xs text-violet-500 dark:text-violet-400">Sans compte</div>
                              </div>
                            </div>
                            {isOwnerOrManager && (
                              <button
                                onClick={() => openAdminEntry(ghost.id, ghost.name, null, ghost.cycle_number)}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors flex-shrink-0"
                                title="Saisir une lecture"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Group Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Créer un groupe</h2>
              <button onClick={closeAllModals} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom du groupe
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ex: Groupe du mardi"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeAllModals} className="flex-1 py-2.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Inviter un membre</h2>
              <button onClick={closeAllModals} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5">
              {joinCode ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 font-medium">Invitation créée ! Partagez ce code :</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm text-slate-800 dark:text-slate-200">
                        {joinCode}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(joinCode); success('Code copié !'); }}
                        className="p-2 text-emerald-600 dark:text-emerald-400"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button onClick={closeAllModals} className="w-full py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">
                    Fermer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Rôle</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                    >
                      <option value="member">Membre</option>
                      <option value="manager">Gestionnaire</option>
                      <option value="viewer">Observateur</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={closeAllModals} className="flex-1 py-2.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      Annuler
                    </button>
                    <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">
                      Inviter
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Supprimer le groupe</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cette action est irréversible. Tous les participants, saisies et données associées seront supprimés.
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={closeAllModals} className="flex-1 py-2.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                Annuler
              </button>
              <button onClick={handleDeleteGroup} className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Settings Bottom Sheet ── */}
      {showGroupSheet && selectedGroupId && (() => {
        const g = groups.find(gr => gr.id === selectedGroupId);
        if (!g) return null;
        const role = groupRoles[selectedGroupId];
        const canManage = ['owner', 'manager'].includes(role || '');
        const canDelete = role === 'owner';
        return (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[60]" onClick={closeAllModals}>
            <div
              className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-md border-t border-slate-200 dark:border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              {/* Sheet header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{g.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{getRoleLabel(role || '')}</p>
              </div>
              {/* Sheet actions */}
              <div className="p-4 space-y-2">
                <button
                  onClick={() => { setShowGroupSheet(false); setSelectedGroupId(selectedGroupId); setShowMembersModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  <Users className="h-4 w-4 text-slate-400" />
                  Voir les membres
                </button>
                {canManage && (
                  <>
                    <button
                      onClick={() => { setShowGroupSheet(false); setSelectedGroupId(selectedGroupId); setShowInviteModal(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      <UserPlus className="h-4 w-4 text-emerald-500" />
                      Inviter un membre
                    </button>
                    {g.invite_code && new Date(g.invite_code_expires_at) > new Date() && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(g.invite_code); success('Code copié !'); setShowGroupSheet(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                      >
                        <Copy className="h-4 w-4 text-blue-500" />
                        Copier le code ({g.invite_code})
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveGroup(selectedGroupId); setShowGroupSheet(false); navigate('/group-settings'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      Réglages du groupe
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    onClick={() => { setShowGroupSheet(false); setSelectedGroupId(selectedGroupId); setShowDeleteModal(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer le groupe
                  </button>
                )}
                <button
                  onClick={closeAllModals}
                  className="w-full py-3 text-sm text-slate-500 dark:text-slate-400 font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Admin Entry Bottom Sheet ── */}
      {showAdminEntrySheet && adminEntryTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-[70]"
          onClick={() => setShowAdminEntrySheet(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            {/* Header */}
            <div className="px-6 pt-3 pb-2">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Saisie de lecture
              </p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {adminEntryTarget.name}
              </h3>
            </div>
            {/* Body */}
            <div className="px-6 pb-10 space-y-5">
              {/* Week picker */}
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Semaine</p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {[0, -7, -14, -21, -28, -35, -42, -49].map((offset) => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const wk = getWeekKeyTuesday(d);
                    const tue = parseWeekKeyTuesday(wk);
                    const label = offset === 0
                      ? 'Cette sem.'
                      : tue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                    return (
                      <button
                        key={offset}
                        onClick={() => {
                          setAdminEntryWeekOffset(offset);
                          if (adminEntryTarget) {
                            fetchAdminEntryForWeek(offset, adminEntryTarget.participantId, adminEntryTarget.user_id, selectedGroupId);
                          }
                        }}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          adminEntryWeekOffset === offset
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Counter */}
              <div className="flex items-center justify-between gap-4 py-2">
                <button
                  onClick={() => setAdminEntryValue(v => Math.max(v - 1, 0))}
                  disabled={adminEntryValue <= 0 || adminEntryLoading}
                  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-25 active:scale-95 transition-all"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <div className="flex-1 text-center">
                  {adminEntryLoading ? (
                    <div className="flex justify-center items-center h-[72px]">
                      <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={adminEntryValue}
                      onChange={(e) => setAdminEntryValue(Math.max(0, Math.min(parseInt(e.target.value) || 0, 60)))}
                      className="w-full text-center text-7xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  )}
                  <p className="text-xs text-slate-400 mt-1">Hizb atteint</p>
                </div>
                <button
                  onClick={() => setAdminEntryValue(v => Math.min(v + 1, 60))}
                  disabled={adminEntryValue >= 60 || adminEntryLoading}
                  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-25 active:scale-95 transition-all"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {/* Type toggles */}
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'restart', 'starting_point'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAdminEntryType(t)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all text-center ${
                      adminEntryType === t
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t === 'normal' ? 'Normal' : t === 'restart' ? 'Nouvelle khatma' : 'Point de départ'}
                  </button>
                ))}
              </div>
              {/* Save */}
              <button
                onClick={handleAdminEntry}
                disabled={adminEntrySaving}
                className="w-full py-4 rounded-2xl font-semibold text-base bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                {adminEntrySaving ? 'Enregistrement…' : 'Enregistrer la lecture'}
              </button>
              <button
                onClick={() => setShowAdminEntrySheet(false)}
                className="w-full text-center text-sm text-slate-400 dark:text-slate-500 py-1"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Join Group Modal ── */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Rejoindre un groupe</h2>
              <button onClick={closeAllModals} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleJoinGroup} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Code d'invitation
                </label>
                <input
                  type="text"
                  required
                  value={joinGroupCode}
                  onChange={(e) => setJoinGroupCode(e.target.value)}
                  placeholder="Code à 15 caractères"
                  maxLength={15}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Votre nom dans le groupe
                </label>
                <input
                  type="text"
                  required
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="ex: Mohamed"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeAllModals} className="flex-1 py-2.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">
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
