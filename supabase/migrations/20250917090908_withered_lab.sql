/*
  # Add user roles and audit tables

  1. New Tables
    - `user_roles`
      - `user_id` (uuid, references auth.users)
      - `role` (text, 'admin' or 'user')
    - `audit_weekly_snapshots`
      - Audit trail for weekly snapshot modifications
      
  2. Security
    - Enable RLS on new tables
    - Add policies for role-based access
    
  3. Updates
    - Add weekly_target_hizb to participants table
*/

-- Add weekly_target_hizb to participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'weekly_target_hizb'
  ) THEN
    ALTER TABLE participants ADD COLUMN weekly_target_hizb INTEGER NOT NULL DEFAULT 7;
    ALTER TABLE participants ADD CONSTRAINT participants_weekly_target_hizb_check 
      CHECK (weekly_target_hizb IN (7, 14));
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create audit table for weekly snapshots
CREATE TABLE IF NOT EXISTS audit_weekly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  week_key_tuesday text NOT NULL,
  old_value_int integer NOT NULL,
  new_value_int integer NOT NULL,
  old_cycle integer NOT NULL DEFAULT 0,
  new_cycle integer NOT NULL DEFAULT 0,
  edited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- Audit policies
CREATE POLICY "Users can read own audit logs"
  ON audit_weekly_snapshots
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can create audit logs"
  ON audit_weekly_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default admin role (replace with your actual user ID)
-- You'll need to update this with the actual user ID from your Supabase auth
-- INSERT INTO user_roles (user_id, role) VALUES ('your-user-id-here', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';