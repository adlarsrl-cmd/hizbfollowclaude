/*
  # HizbFollow Database Schema

  1. New Tables
    - `participants`: Store participant information with cycle tracking
    - `entries`: Store all reading entries with timestamps
    - `weekly_snapshots`: Store weekly checkpoint data
    - `app_settings`: Store user preferences and configuration
    - `notifications_subscriptions`: Store notification preferences
    - `groups`: Future multi-user support (hidden UI for now)
    - `user_links`: Future linking between participants and user accounts
    - `invitations`: Future invitation system

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add owner_id columns for multi-tenancy support

  3. Indexes
    - Add indexes for common query patterns
    - Optimize for timeline queries and participant lookups
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  email text,
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  cycle_number integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Entries table (all reading entries)
CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  unit_type text NOT NULL CHECK (unit_type IN ('hizb', 'page')),
  value_int integer NOT NULL CHECK (value_int > 0),
  cycle_number integer NOT NULL DEFAULT 0,
  note text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'seed')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weekly snapshots table
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL,
  week_key_tuesday text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('hizb', 'page')),
  value_int integer NOT NULL CHECK (value_int > 0),
  cycle_number integer NOT NULL DEFAULT 0,
  cumulative_hizb integer NOT NULL DEFAULT 0,
  cumulative_pages integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, participant_id, week_key_tuesday)
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  owner_id uuid PRIMARY KEY DEFAULT auth.uid(),
  timezone text NOT NULL DEFAULT 'Europe/Brussels',
  checkpoint_window_start time NOT NULL DEFAULT '20:00',
  checkpoint_window_end time NOT NULL DEFAULT '23:00',
  default_unit text NOT NULL DEFAULT 'hizb' CHECK (default_unit IN ('hizb', 'page')),
  allow_iso_view boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications subscriptions table
CREATE TABLE IF NOT EXISTS notifications_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  email text,
  web_push_endpoint text,
  web_push_p256dh text,
  web_push_auth text,
  created_at timestamptz DEFAULT now()
);

-- Future multi-user support tables (hidden UI for now)
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  is_private boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  user_id uuid,
  invitation_token text,
  linked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Participants
CREATE POLICY "Users can manage own participants"
  ON participants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Entries
CREATE POLICY "Users can manage own entries"
  ON entries
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Weekly snapshots
CREATE POLICY "Users can access own snapshots"
  ON weekly_snapshots
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- App settings
CREATE POLICY "Users can manage own settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Notifications
CREATE POLICY "Users can manage own notifications"
  ON notifications_subscriptions
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Groups
CREATE POLICY "Users can manage own groups"
  ON groups
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- User links (special case - participants can be linked to other users)
CREATE POLICY "Users can manage participant links"
  ON user_links
  FOR ALL
  TO authenticated
  USING (
    participant_id IN (
      SELECT id FROM participants WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Invitations
CREATE POLICY "Users can manage own invitations"
  ON invitations
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_owner_active ON participants(owner_id, active);
CREATE INDEX IF NOT EXISTS idx_entries_participant_recorded ON entries(participant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_owner_recorded ON entries(owner_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_owner_week ON weekly_snapshots(owner_id, week_key_tuesday);
CREATE INDEX IF NOT EXISTS idx_snapshots_participant_week ON weekly_snapshots(participant_id, week_key_tuesday);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_snapshots_updated_at
  BEFORE UPDATE ON weekly_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();