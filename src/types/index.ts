export interface Participant {
  id: string;
  owner_id: string;
  group_id: string;
  user_id?: string;
  name: string;
  email?: string;
  avatar_url?: string;
  active: boolean;
  weekly_target_hizb: 7 | 14;
  cycle_number: number;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  owner_id: string;
  group_id: string;
  participant_id: string;
  user_id?: string;
  unit_type: 'hizb' | 'page';
  value_int: number;
  cycle_number: number;
  note?: string;
  source: 'manual' | 'import' | 'seed' | 'starting_point';
  recorded_at: string;
  created_at: string;
  updated_at: string;
  is_restart?: boolean;
  previous_position?: number;
}

export interface RamadanEntry {
  id: string;
  group_id: string;
  participant_id: string;
  user_id?: string;
  hizb_position: number;
  recorded_date: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklySnapshot {
  id: string;
  owner_id: string;
  group_id: string;
  participant_id: string;
  snapshot_at: string;
  week_key_tuesday: string;
  unit_type: 'hizb' | 'page';
  value_int: number;
  cycle_number: number;
  cumulative_hizb: number;
  cumulative_pages: number;
  created_at: string;
  updated_at: string;
  participant?: Participant;
}

export interface AppSettings {
  owner_id: string;
  group_id: string;
  timezone: string;
  checkpoint_window_start: string;
  checkpoint_window_end: string;
  default_unit: 'hizb' | 'page';
  allow_iso_view: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  reference_day: string;
  settings: Record<string, any>;
  created_by: string;
  created_at: string;
  invite_code?: string;
  invite_code_expires_at?: string;
  archived: boolean;
  archived_at?: string;
  archived_by?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'member' | 'viewer';
  can_write_self: boolean;
  created_at: string;
  user_profile?: UserProfile;
}

export interface UserProfile {
  user_id: string;
  full_name?: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  locale: string;
  deleted_at?: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  email: string;
  role: 'manager' | 'member' | 'viewer';
  join_code?: string;
  expires_at?: string;
  accepted_at?: string;
  created_at: string;
}

export interface NotificationSubscription {
  id: string;
  owner_id: string;
  group_id: string;
  email?: string;
  web_push_endpoint?: string;
  web_push_p256dh?: string;
  web_push_auth?: string;
  created_at: string;
}

export interface UserLink {
  id: string;
  participant_id: string;
  user_id?: string;
  invitation_token?: string;
  linked_at?: string;
  created_at: string;
}

export type UnitType = 'hizb' | 'page';
export type ViewMode = 'table' | 'card';
export type Theme = 'light' | 'dark' | 'auto';