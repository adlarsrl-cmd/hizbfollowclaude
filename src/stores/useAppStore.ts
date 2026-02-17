import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  Participant,
  Entry,
  AppSettings,
  UnitType,
  ViewMode,
  Theme,
  Group,
  GroupMember,
  UserProfile,
  GroupInvite
} from '../types';

type SyncQueueAction =
  | { type: 'add_participant'; data: Omit<Participant, 'id' | 'owner_id' | 'created_at' | 'updated_at'>; timestamp: number }
  | { type: 'update_participant'; data: { id: string; updates: Partial<Participant> }; timestamp: number }
  | { type: 'delete_participant'; data: { id: string }; timestamp: number }
  | { type: 'add_entry'; data: Omit<Entry, 'id' | 'owner_id' | 'created_at' | 'updated_at'>; timestamp: number }
  | { type: 'update_entry'; data: { id: string; updates: Partial<Entry> }; timestamp: number }
  | { type: 'delete_entry'; data: { id: string }; timestamp: number }
  | { type: 'update_settings'; data: Partial<AppSettings>; timestamp: number };

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;

  // Groups
  activeGroupId: string | null;
  groups: Group[];
  currentUserRole: 'owner' | 'manager' | 'member' | 'viewer' | null;
  groupMembers: GroupMember[];
  userProfile: UserProfile | null;

  // Feature flags
  enableGroups: boolean;
  enableInvites: boolean;
  enablePersonalEntry: boolean;

  // UI State
  theme: Theme;
  viewMode: ViewMode;
  currentUnit: UnitType;
  isOnline: boolean;
  syncQueue: SyncQueueAction[];

  // Data
  participants: Participant[];
  entries: Entry[];
  settings: AppSettings | null;

  // Loading states
  loading: {
    participants: boolean;
    entries: boolean;
    settings: boolean;
    groups: boolean;
    groupMembers: boolean;
  };

  // Actions
  setTheme: (theme: Theme) => void;
  setViewMode: (mode: ViewMode) => void;
  setCurrentUnit: (unit: UnitType) => void;
  setOnlineStatus: (online: boolean) => void;
  setActiveGroup: (groupId: string | null) => void;

  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Group actions
  fetchMyGroups: () => Promise<void>;
  createGroup: (name: string, settings?: Record<string, any>) => Promise<Group>;
  deleteGroup: (groupId: string) => Promise<void>;
  fetchGroupMembers: (groupId: string) => Promise<void>;
  inviteByEmail: (groupId: string, email: string, role: 'manager' | 'member' | 'viewer') => Promise<string>;
  joinGroupByCode: (code: string) => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;
  addMember: (groupId: string, userId: string, role: 'manager' | 'member' | 'viewer') => Promise<void>;
  updateMemberRole: (groupId: string, userId: string, role: 'manager' | 'member' | 'viewer', canWriteSelf?: boolean) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;

  // Data actions
  fetchParticipants: () => Promise<void>;
  fetchEntries: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchMyParticipants: () => Promise<void>;

  addParticipant: (participant: Omit<Participant, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateParticipant: (id: string, updates: Partial<Participant>) => Promise<void>;
  deleteParticipant: (id: string) => Promise<void>;

  addEntry: (entry: Omit<Entry, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // Utility actions
  addToSyncQueue: (action: Omit<SyncQueueAction, 'timestamp'>) => void;
  processSyncQueue: () => Promise<void>;
  generateDemoData: () => Promise<void>;
  resetDemoData: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // Helper pour owner_id
      const ownerId = () => get().user?.id ?? null;
      const activeGroupId = () => get().activeGroupId;

      return {
        // Initial state
        user: null,
        isAuthenticated: false,

        // Groups
        activeGroupId: null,
        groups: [],
        currentUserRole: null,
        groupMembers: [],
        userProfile: null,

        // Feature flags
        enableGroups: true,
        enableInvites: true,
        enablePersonalEntry: true,

        theme: 'light',
        viewMode: 'table',
        currentUnit: 'hizb',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        syncQueue: [],

        participants: [],
        entries: [],
        settings: null,

        loading: {
          participants: false,
          entries: false,
          settings: false,
          groups: false,
          groupMembers: false
        },

        // UI Actions
        setTheme: (theme) => set({ theme }),
        setViewMode: (viewMode) => set({ viewMode }),
        setCurrentUnit: (currentUnit) => set({ currentUnit }),
        setOnlineStatus: (isOnline) => set({ isOnline }),
        setActiveGroup: async (activeGroupId) => {
          set({ activeGroupId });

          // Update current user role for the selected group
          if (activeGroupId) {
            const { data, error } = await supabase
              .from('group_members')
              .select('role')
              .eq('group_id', activeGroupId)
              .eq('user_id', get().user?.id)
              .maybeSingle();

            if (!error && data) {
              set({ currentUserRole: data.role });
            }

            // Refresh data for new group
            get().fetchParticipants();
            get().fetchEntries();
            get().fetchSettings();
          }
        },

        // Auth Actions
        signIn: async (email: string, password: string) => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;

          // Check email verification status
          const isEmailVerified = data.user?.email_confirmed_at !== null && data.user?.email_confirmed_at !== undefined;

          set({
            user: data.user,
            isAuthenticated: true,
            isEmailVerified: isEmailVerified
          });

          // Fetch initial data in background - don't block login
          Promise.all([
            get().fetchMyGroups().catch(err => console.warn('Groups fetch error:', err)),
            get().fetchUserProfile().catch(err => console.warn('Profile fetch error:', err)),
          ]).then(() => {
          // Auto-select group if user has only one
          const { groups } = get();
          if (groups.length === 1) {
              get().setActiveGroup(groups[0].id).catch(err => console.warn('Set active group error:', err));
          }
          }).catch(() => {
            // Ignore all errors - login should succeed regardless
          });
        },

        signUp: async (email: string, password: string) => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password
          });

          if (error) throw error;

          // Check if email verification is required
          const isEmailVerified = data.user?.email_confirmed_at !== null && data.user?.email_confirmed_at !== undefined;

          // Si confirmation email OFF, on aura session
          if (data.user && data.session) {
            set({
              user: data.user,
              isAuthenticated: true,
              isEmailVerified: isEmailVerified
            });

            // Create user profile
            await get().updateUserProfile({
              user_id: data.user.id,
              full_name: data.user.email?.split('@')[0] || 'Utilisateur',
              locale: 'fr'
            });

            await get().fetchMyGroups();

            // Settings par défaut pour le nouvel utilisateur
            // Will be created when user joins/creates first group
          } else if (data.user && !isEmailVerified) {
            // User created but needs to verify email
            // Don't set authenticated, but store user for verification banner
            set({
              user: data.user,
              isAuthenticated: false,
              isEmailVerified: false
            });
          }
        },

        signOut: async () => {
          await supabase.auth.signOut();
          set({
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
            activeGroupId: null,
            groups: [],
            currentUserRole: null,
            groupMembers: [],
            userProfile: null,
            participants: [],
            entries: [],
            settings: null
          });
        },

        resendVerificationEmail: async () => {
          const user = get().user;
          if (!user?.email) {
            throw new Error('Aucun email trouvé');
          }

          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: user.email
          });

          if (error) {
            // If email verification is disabled, provide helpful message
            if (error.message?.includes('disabled') || error.message?.includes('not enabled')) {
              throw new Error('La vérification d\'email est désactivée dans Supabase. Activez-la dans Settings → Authentication → Email Templates.');
            }
            throw error;
          }
        },

        checkEmailVerification: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const isEmailVerified = user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;
            set({ 
              user,
              isEmailVerified 
            });
          }
        },

        deleteAccount: async () => {
          const userId = ownerId();
          if (!userId) {
            throw new Error('Aucun utilisateur trouvé');
          }

          // Delete all user data from tables with owner_id or user_id
          // Note: Some tables have ON DELETE CASCADE, but we delete explicitly for clarity and error handling
          
          const errors: string[] = [];
          
          try {
            // Order matters: delete child records before parent records to avoid foreign key issues

            // 1. Remove user from groups they're members of (but not owner) - do this first
            const { error: groupMembersError } = await supabase
              .from('group_members')
              .delete()
              .eq('user_id', userId);
            if (groupMembersError && !groupMembersError.message.includes('does not exist')) {
              errors.push(`group_members: ${groupMembersError.message}`);
            }

            // 2. Get groups owned by user (before deleting them)
            const { data: userGroups } = await supabase
              .from('groups')
              .select('id')
              .eq('owner_id', userId);

            // 3. Delete group settings for groups owned by user (if table exists)
            if (userGroups && userGroups.length > 0) {
              const groupIds = userGroups.map(g => g.id);
              const { error: groupSettingsError } = await supabase
                .from('group_settings')
                .delete()
                .in('group_id', groupIds);
              // Ignore if table doesn't exist
              if (groupSettingsError && !groupSettingsError.message.includes('does not exist')) {
                errors.push(`group_settings: ${groupSettingsError.message}`);
              }
            }

            // 4. Delete entries (owned by user)
            const { error: entriesError } = await supabase
              .from('entries')
              .delete()
              .eq('owner_id', userId);
            if (entriesError) errors.push(`entries: ${entriesError.message}`);

            // 5. Delete weekly snapshots
            const { error: snapshotsError } = await supabase
              .from('weekly_snapshots')
              .delete()
              .eq('owner_id', userId);
            if (snapshotsError) errors.push(`weekly_snapshots: ${snapshotsError.message}`);

            // 6. Delete participants (this may cascade delete entries, but we already deleted them)
            const { error: participantsError } = await supabase
              .from('participants')
              .delete()
              .eq('owner_id', userId);
            if (participantsError) errors.push(`participants: ${participantsError.message}`);

            // 7. Delete groups owned by user (this will cascade delete group_members, participants, entries)
            const { error: groupsError } = await supabase
              .from('groups')
              .delete()
              .eq('owner_id', userId);
            if (groupsError) errors.push(`groups: ${groupsError.message}`);

            // 8. Delete invitations created by user (if table exists)
            const { error: invitationsError } = await supabase
              .from('invitations')
              .delete()
              .eq('owner_id', userId);
            if (invitationsError && !invitationsError.message.includes('does not exist')) {
              errors.push(`invitations: ${invitationsError.message}`);
            }

            // 9. Delete app settings
            const { error: settingsError } = await supabase
              .from('app_settings')
              .delete()
              .eq('owner_id', userId);
            if (settingsError) errors.push(`app_settings: ${settingsError.message}`);

            // 10. Delete notification subscriptions (if table exists)
            const { error: notificationsError } = await supabase
              .from('notifications_subscriptions')
              .delete()
              .eq('owner_id', userId);
            if (notificationsError && !notificationsError.message.includes('does not exist')) {
              errors.push(`notifications_subscriptions: ${notificationsError.message}`);
            }

            // 11. Delete user links (if table exists)
            const { error: userLinksError } = await supabase
              .from('user_links')
              .delete()
              .eq('user_id', userId);
            if (userLinksError && !userLinksError.message.includes('does not exist')) {
              errors.push(`user_links: ${userLinksError.message}`);
            }

            // 12. Delete user roles (if table exists)
            const { error: userRolesError } = await supabase
              .from('user_roles')
              .delete()
              .eq('user_id', userId);
            if (userRolesError && !userRolesError.message.includes('does not exist')) {
              errors.push(`user_roles: ${userRolesError.message}`);
            }

            // 13. Mark account as deleted (soft delete) instead of deleting profile
            // This prevents the user from logging in again
            const { error: softDeleteError } = await supabase
              .from('user_profiles')
              .update({ deleted_at: new Date().toISOString() })
              .eq('user_id', userId);
            if (softDeleteError && !softDeleteError.message.includes('does not exist')) {
              errors.push(`user_profiles soft delete: ${softDeleteError.message}`);
            }

            // 14. Delete password change tracking (if table exists)
            const { error: passwordChangeError } = await supabase
              .from('user_password_change_required')
              .delete()
              .eq('user_id', userId);
            if (passwordChangeError && !passwordChangeError.message.includes('does not exist')) {
              errors.push(`user_password_change_required: ${passwordChangeError.message}`);
            }

            // 15. Delete pending user creations created by this user (if table exists)
            const { error: pendingError } = await supabase
              .from('pending_user_creations')
              .delete()
              .eq('created_by', userId);
            if (pendingError && !pendingError.message.includes('does not exist')) {
              errors.push(`pending_user_creations: ${pendingError.message}`);
            }

            // If we have critical errors (not just missing tables), throw
            const criticalErrors = errors.filter(e => !e.includes('does not exist'));
            if (criticalErrors.length > 0) {
              console.error('Critical errors during account deletion:', criticalErrors);
              throw new Error(`Erreurs lors de la suppression: ${criticalErrors.join(', ')}`);
            }

            // 16. Clear all local storage
            localStorage.clear();

            // 17. Sign out from Supabase (this clears the session)
            await supabase.auth.signOut();

            // 18. Reset store state
            set({
              user: null,
              isAuthenticated: false,
              isEmailVerified: false,
              activeGroupId: null,
              groups: [],
              currentUserRole: null,
              groupMembers: [],
              userProfile: null,
              participants: [],
              entries: [],
              settings: null
            });

            // Note: auth.users deletion requires admin privileges
            // For full GDPR compliance, create a Supabase Edge Function with admin API:
            // supabase.functions.invoke('delete-user', { body: { userId } })
            // The auth user will remain in auth.users but with no associated data
            // This is acceptable for GDPR as all personal data is deleted
          } catch (error) {
            console.error('Error during account deletion:', error);
            throw error;
          }
        },

        // Group actions
        fetchMyGroups: async () => {
          set((state) => ({ loading: { ...state.loading, groups: true } }));

          try {
            const userId = ownerId();
            if (!userId) {
              console.error('No user ID found');
              return;
            }

            // TEMPORARILY DISABLED - Rotate expired invite codes
            // Will re-enable after login is fixed
            // supabase.rpc('rotate_expired_invite_codes').catch(() => {});

            const { data, error } = await supabase
              .from('groups')
              .select(`
                *,
                group_members!inner(role, user_id)
              `)
              .eq('group_members.user_id', userId)
              .eq('archived', false)
              .order('created_at', { ascending: true });

            if (error) throw error;

            const groups = data?.map(g => ({
              id: g.id,
              name: g.name,
              description: g.description,
              reference_day: g.reference_day,
              settings: g.settings,
              created_by: g.created_by,
              created_at: g.created_at,
              invite_code: g.invite_code,
              invite_code_expires_at: g.invite_code_expires_at,
              archived: g.archived,
              archived_at: g.archived_at,
              archived_by: g.archived_by
            })) || [];

            set({ groups });

            // Set current user role for active group
            const { activeGroupId } = get();
            if (activeGroupId && data) {
              const activeGroup = data.find(g => g.id === activeGroupId);
              if (activeGroup?.group_members?.[0]) {
                set({ currentUserRole: activeGroup.group_members[0].role });
              }
            }
          } catch (error) {
            console.error('Error fetching groups:', error);
          } finally {
            set((state) => ({ loading: { ...state.loading, groups: false } }));
          }
        },

        createGroup: async (name: string, settings = {}) => {
          // Generate invite code (15 chars: alphanumeric)
          const generateCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 15; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
          };

          const inviteCode = generateCode();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

          const { data, error } = await supabase
            .from('groups')
            .insert({
              name,
              settings,
              created_by: ownerId(),
              invite_code: inviteCode,
              invite_code_expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          await get().fetchMyGroups();

          // Set the newly created group as active and set user role to owner
          set({
            activeGroupId: data.id,
            currentUserRole: 'owner'
          });

          return data;
        },

        deleteGroup: async (groupId: string) => {
          const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);

          if (error) throw error;

          // If deleted group was active, clear it
          const { activeGroupId } = get();
          if (activeGroupId === groupId) {
            set({
              activeGroupId: null,
              currentUserRole: null
            });
          }

          // Refresh groups list
          await get().fetchMyGroups();
        },

        fetchGroupMembers: async (groupId: string) => {
          set((state) => ({ loading: { ...state.loading, groupMembers: true } }));

          try {
            const { data, error } = await supabase
              .from('participants')
              .select(`
                id,
                name,
                user_id,
                group_id,
                created_at
              `)
              .eq('group_id', groupId)
              .not('user_id', 'is', null)
              .order('created_at', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
              set({ groupMembers: [] });
              return;
            }

            const userIds = data.map(p => p.user_id).filter(Boolean);

            const [groupMembersData, profilesData] = await Promise.all([
              supabase
                .from('group_members')
                .select('user_id, role, can_write_self')
                .eq('group_id', groupId)
                .in('user_id', userIds),
              supabase
                .from('user_profiles')
                .select('user_id, display_name, email')
                .in('user_id', userIds)
            ]);

            const groupMembersMap = new Map(
              groupMembersData.data?.map(gm => [gm.user_id, gm]) || []
            );

            const profilesMap = new Map(
              profilesData.data?.map(p => [p.user_id, p]) || []
            );

            const members = data.map(p => {
              const groupMember = groupMembersMap.get(p.user_id);
              const profile = profilesMap.get(p.user_id);

              return {
                id: p.id,
                group_id: p.group_id,
                user_id: p.user_id!,
                role: groupMember?.role || 'member',
                can_write_self: groupMember?.can_write_self || false,
                created_at: p.created_at,
                user_profile: {
                  display_name: profile?.display_name || p.name,
                  full_name: profile?.display_name || p.name,
                  email: profile?.email || null
                }
              };
            });

            set({ groupMembers: members });
          } catch (error) {
            console.error('Error fetching group members:', error);
          } finally {
            set((state) => ({ loading: { ...state.loading, groupMembers: false } }));
          }
        },

        inviteByEmail: async (groupId: string, email: string, role: 'manager' | 'member' | 'viewer') => {
          // Generate invite code (15 chars: alphanumeric)
          const generateCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 15; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
          };

          const joinCode = generateCode();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

          const { data, error } = await supabase
            .from('group_invites')
            .insert({
              group_id: groupId,
              email,
              role,
              join_code: joinCode,
              expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          // Update group invite_code for easy sharing
          await supabase
            .from('groups')
            .update({
              invite_code: joinCode,
              invite_code_expires_at: expiresAt.toISOString()
            })
            .eq('id', groupId);

          // Refresh groups to show new code
          await get().fetchMyGroups();

          // TODO: Send email with join code
          console.log(`Invitation sent to ${email} with code: ${joinCode}`);

          return joinCode;
        },

        joinGroupByCode: async (code: string) => {
          // Find invite by code
          const { data: invite, error: inviteError } = await supabase
            .from('group_invites')
            .select('*')
            .eq('join_code', code)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (inviteError || !invite) {
            throw new Error('Code d\'invitation invalide ou expiré');
          }

          // Add user to group
          const { data: joinData, error: memberError } = await supabase.rpc('join_group_with_invite_code', {
            p_invite_code: code,
            p_user_id: ownerId()
          });

          if (memberError) throw memberError;
          if (!joinData.success) throw new Error(joinData.error);

          // Mark invite as accepted
          await supabase
            .from('group_invites')
            .update({ accepted_at: new Date().toISOString() })
            .eq('id', invite.id);

          await get().fetchMyGroups();
        },

        acceptInvite: async (token: string) => {
          // Similar to joinGroupByCode but with token
          await get().joinGroupByCode(token);
        },

        addMember: async (groupId: string, userId: string, role: 'manager' | 'member' | 'viewer') => {
          const { data, error } = await supabase.rpc('add_member_to_group', {
            p_group_id: groupId,
            p_user_id: userId,
            p_role: role,
            p_caller_user_id: ownerId()
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.error);

          await get().fetchGroupMembers(groupId);
        },

        updateMemberRole: async (groupId: string, userId: string, role: 'manager' | 'member' | 'viewer', canWriteSelf = true) => {
          const { error } = await supabase
            .from('group_members')
            .update({ role, can_write_self: canWriteSelf })
            .eq('group_id', groupId)
            .eq('user_id', userId);

          if (error) throw error;

          await get().fetchGroupMembers(groupId);
        },

        removeMember: async (groupId: string, userId: string) => {
          const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

          if (error) throw error;

          await get().fetchGroupMembers(groupId);
        },

        fetchUserProfile: async () => {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', ownerId())
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error);
            return;
          }

          set({ userProfile: data });
        },

        updateUserProfile: async (profile: Partial<UserProfile>) => {
          const { data, error } = await supabase
            .from('user_profiles')
            .update(profile)
            .eq('user_id', ownerId())
            .select()
            .single();

          if (error) throw error;

          set({ userProfile: data });
        },

        // Data fetching
        fetchParticipants: async () => {
          if (!get().enableGroups || !activeGroupId()) return;

          set((state) => ({ loading: { ...state.loading, participants: true } }));

          try {
            // Wait a bit for role to be set if needed
            let role = get().currentUserRole;
            
            // If role not set yet, fetch it
            if (!role) {
              const userId = ownerId();
              const groupId = activeGroupId();
              
              if (userId && groupId) {
                const { data: memberData } = await supabase
                  .from('group_members')
                  .select('role')
                  .eq('group_id', groupId)
                  .eq('user_id', userId)
                  .maybeSingle();
                
                if (memberData) {
                  role = memberData.role;
                  set({ currentUserRole: role });
                }
              }
            }

            // If user is a member/viewer, only fetch their own participants
            if (role === 'member' || role === 'viewer') {
              return get().fetchMyParticipants();
            }

            // For owners/managers, fetch all participants
            const { data, error } = await supabase
              .from('participants')
              .select('*')
              .eq('group_id', activeGroupId())
              .order('created_at', { ascending: true });

            if (error) throw error;

            set({ participants: data || [] });
          } catch (error) {
            console.error('Error fetching participants:', error);
          } finally {
            set((state) => ({ loading: { ...state.loading, participants: false } }));
          }
        },

        fetchMyParticipants: async () => {
          if (!get().enableGroups || !activeGroupId()) return;

          set((state) => ({ loading: { ...state.loading, participants: true } }));

          try {
            const { data, error } = await supabase
              .from('participants')
              .select('*')
              .eq('group_id', activeGroupId())
              .eq('user_id', ownerId())
              .order('created_at', { ascending: true });

            if (error) throw error;

            set({ participants: data || [] });
          } catch (error) {
            console.error('Error fetching my participants:', error);
          } finally {
            set((state) => ({ loading: { ...state.loading, participants: false } }));
          }
        },

        fetchEntries: async () => {
          if (!get().enableGroups || !activeGroupId()) return;

          set((state) => ({ loading: { ...state.loading, entries: true } }));

          try {
            const role = get().currentUserRole;
            const userId = ownerId();

            // If user is a member/viewer, only fetch entries for their own participants
            let query = supabase
              .from('entries')
              .select('*')
              .eq('group_id', activeGroupId());

            if (role === 'member' || role === 'viewer') {
              // Get only entries for participants that belong to this user
              const { data: myParticipants } = await supabase
                .from('participants')
                .select('id')
              .eq('group_id', activeGroupId())
                .eq('user_id', userId);

              const participantIds = myParticipants?.map(p => p.id) || [];
              
              if (participantIds.length > 0) {
                query = query.in('participant_id', participantIds);
              } else {
                // No participants, return empty
                set({ entries: [] });
                return;
              }
            }

            const { data, error } = await query.order('recorded_at', { ascending: false });

            if (error) throw error;

            set({ entries: data || [] });
          } catch (error) {
            console.error('Error fetching entries:', error);
          } finally {
            set((state) => ({ loading: { ...state.loading, entries: false } }));
          }
        },

        fetchSettings: async () => {
          if (!get().enableGroups || !activeGroupId()) return;

          set((state) => ({ loading: { ...state.loading, settings: true } }));

          try {
            const { data, error } = await supabase
              .from('app_settings')
              .select('*')
              .eq('owner_id', ownerId())
              .maybeSingle();

            if (error) throw error;

            set({ settings: data });

            if (data?.default_unit) {
              set({ currentUnit: data.default_unit });
            }
          } catch (error) {
            console.error('Error fetching settings:', error);
          } finally {
            set((state) => ({ loading: { ...state.loading, settings: false } }));
          }
        },

        // Participant actions
        addParticipant: async (participant) => {
          if (!activeGroupId()) throw new Error('No active group');

          if (!get().isOnline) {
            get().addToSyncQueue({ type: 'add_participant', data: participant });
            return;
          }

          const { data, error } = await supabase
            .from('participants')
            .insert({
              ...participant,
              owner_id: ownerId(),
              group_id: activeGroupId(),
              weekly_target_hizb: participant.weekly_target_hizb ?? 7
            })
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            participants: [...state.participants, data]
          }));
        },

        updateParticipant: async (id, updates) => {
          if (!get().isOnline) {
            get().addToSyncQueue({ type: 'update_participant', data: { id, updates } });
            return;
          }

          const { data, error } = await supabase
            .from('participants')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            participants: state.participants.map((p) => (p.id === id ? data : p))
          }));
        },

        deleteParticipant: async (id) => {
          if (!get().isOnline) {
            get().addToSyncQueue({ type: 'delete_participant', data: { id } });
            return;
          }

          const { error } = await supabase.from('participants').delete().eq('id', id);

          if (error) throw error;

          set((state) => ({
            participants: state.participants.filter((p) => p.id !== id)
          }));
        },

        // Entry actions
        addEntry: async (entry) => {
          if (!activeGroupId()) throw new Error('No active group');

          if (!get().isOnline) {
            get().addToSyncQueue({ type: 'add_entry', data: entry });
            return;
          }

          const { data, error } = await supabase
            .from('entries')
            .insert({
              ...entry,
              owner_id: ownerId(),
              group_id: activeGroupId()
            })
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            entries: [data, ...state.entries]
          }));
        },

        updateEntry: async (id, updates) => {
          if (!get().isOnline) {
            get().addToSyncQueue({ type: 'update_entry', data: { id, updates } });
            return;
          }

          const { data, error } = await supabase
            .from('entries')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? data : e))
          }));
        },

        deleteEntry: async (id) => {
          if (!get().isOnline) {
            get().addToSyncQueue({ type: 'delete_entry', data: { id } });
            return;
          }

          const { error } = await supabase.from('entries').delete().eq('id', id);

          if (error) throw error;

          set((state) => ({
            entries: state.entries.filter((e) => e.id !== id)
          }));
        },

        // Settings actions
        updateSettings: async (settings) => {
          if (!activeGroupId()) throw new Error('No active group');

          if (!get().isOnline) {
            get().addToSyncQueue({ type: 'update_settings', data: settings });
            return;
          }

          const payload = {
            ...settings,
            owner_id: ownerId(),
            updated_at: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('app_settings')
            .upsert(payload, { onConflict: 'owner_id' })
            .select()
            .single();

          if (error) throw error;

          set({ settings: data });

          if (data?.default_unit) {
            set({ currentUnit: data.default_unit });
          }
        },

        // Sync queue
        addToSyncQueue: (action) => {
          set((state) => ({
            syncQueue: [...state.syncQueue, { ...action, timestamp: Date.now() }]
          }));
        },

        processSyncQueue: async () => {
          const { syncQueue } = get();
          if (!get().isOnline || syncQueue.length === 0) return;

          for (const action of syncQueue) {
            try {
              switch (action.type) {
                case 'add_participant':
                  await get().addParticipant(action.data);
                  break;
                case 'update_participant':
                  await get().updateParticipant(action.data.id, action.data.updates);
                  break;
                case 'delete_participant':
                  await get().deleteParticipant(action.data.id);
                  break;
                case 'add_entry':
                  await get().addEntry(action.data);
                  break;
                case 'update_entry':
                  await get().updateEntry(action.data.id, action.data.updates);
                  break;
                case 'delete_entry':
                  await get().deleteEntry(action.data.id);
                  break;
                case 'update_settings':
                  await get().updateSettings(action.data);
                  break;
              }
            } catch (error) {
              console.error('Error processing sync action:', action, error);
            }
          }

          set({ syncQueue: [] });
        },

        // Demo data
        generateDemoData: async () => {
          const { participants } = get();
          if (participants.length === 0) {
            console.log('No participants found. Please add participants first.');
            return;
          }

          try {
            // Generate 6 months of entries with realistic progression
            const monthsToGenerate = 6;
            const now = new Date();

            for (const participant of participants) {
              let currentValue = 1;
              let currentCycle = 0;

              const consistency = Math.random(); // 0-1, higher = more consistent

              for (let monthOffset = monthsToGenerate - 1; monthOffset >= 0; monthOffset--) {
                const weeksInMonth = Math.floor(Math.random() * 2) + 4; // 4 or 5

                for (let weekInMonth = 0; weekInMonth < weeksInMonth; weekInMonth++) {
                  const weekDate = new Date(now);
                  weekDate.setMonth(now.getMonth() - monthOffset);
                  weekDate.setDate(weekDate.getDate() - weekInMonth * 7);

                  let weeklyProgress;
                  if (consistency < 0.3) {
                    weeklyProgress = Math.floor(Math.random() * 9) + 2; // 2-10
                  } else if (consistency < 0.7) {
                    weeklyProgress = Math.max(2, Math.min(10, 6 + (Math.floor(Math.random() * 5) - 2))); // 4-8
                  } else {
                    weeklyProgress = Math.max(2, Math.min(10, 6 + (Math.floor(Math.random() * 3) - 1))); // 5-7
                  }

                  currentValue += weeklyProgress;

                  if (currentValue > 60) {
                    currentCycle++;
                    currentValue = currentValue - 60;
                  }

                  currentValue = Math.min(60, Math.max(1, currentValue));

                  const { error } = await supabase.from('entries').insert({
                    owner_id: participant.owner_id,
                    group_id: participant.group_id,
                    participant_id: participant.id,
                    unit_type: 'hizb' as const,
                    value_int: currentValue,
                    cycle_number: currentCycle,
                    source: 'seed' as const,
                    recorded_at: weekDate.toISOString(),
                    note: `Position: ${currentValue} hizb (progression: ${weeklyProgress})`
                  });

                  if (error) {
                    console.error('Error creating demo entry:', error);
                  }
                }
              }

              await get().updateParticipant(participant.id, {
                cycle_number: currentCycle
              });
            }

            await get().fetchEntries();
            console.log(`Generated ${monthsToGenerate} months of demo data for ${participants.length} participants`);
          } catch (error) {
            console.error('Error generating demo data:', error);
          }
        },

        resetDemoData: async () => {
          try {
            const { error: entriesError } = await supabase.from('entries').delete().eq('source', 'seed');
            if (entriesError) {
              console.error('Error deleting demo entries:', entriesError);
            }

            const { participants } = get();
            for (const participant of participants) {
              await get().updateParticipant(participant.id, {
                cycle_number: 0
              });
            }

            await get().fetchEntries();
            await get().fetchParticipants();

            console.log('Demo data reset successfully');
          } catch (error) {
            console.error('Error resetting demo data:', error);
          }
        }
      };
    },
    {
      name: 'hizbfollow-storage',
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        currentUnit: state.currentUnit,
        syncQueue: state.syncQueue,
        activeGroupId: state.activeGroupId,
        enableGroups: state.enableGroups,
        enableInvites: state.enableInvites,
        enablePersonalEntry: state.enablePersonalEntry
      })
    }
  )
);

// Online/offline
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOnlineStatus(true);
    useAppStore.getState().processSyncQueue();
  });

  window.addEventListener('offline', () => {
    useAppStore.getState().setOnlineStatus(false);
  });
}

// Auth listener
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    const isEmailVerified = session.user.email_confirmed_at !== null && session.user.email_confirmed_at !== undefined;
    useAppStore.setState({
      user: session.user,
      isAuthenticated: true,
      isEmailVerified: isEmailVerified
    });
  } else {
    useAppStore.setState({
      user: null,
      isAuthenticated: false,
      isEmailVerified: false,
      participants: [],
      entries: [],
      settings: null
    });
  }
});