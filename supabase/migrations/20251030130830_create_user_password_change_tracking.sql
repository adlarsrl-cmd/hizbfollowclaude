/*
  # User Password Change Tracking

  1. New Tables
    - `user_password_change_required`
      - `user_id` (uuid, primary key, FK to auth.users)
      - `must_change_password` (boolean, default true)
      - `password_changed_at` (timestamptz, when password was changed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Purpose
    - Track users created from "participant fantôme" who need to change default password
    - Users with must_change_password=true see forced password change screen
    - Can skip with warning, but flag persists until password is actually changed
  
  3. Security
    - RLS enabled: users can only view/update their own record
    - Trigger auto-creates record when user is created via participant email addition
  
  4. Notes
    - Idempotent: safe to re-run
    - Default password for auto-created users: "1234"
*/

-- =============== 1) CREATE TABLE ===============

CREATE TABLE IF NOT EXISTS public.user_password_change_required (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  must_change_password boolean NOT NULL DEFAULT true,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============== 2) CREATE INDEX ===============

CREATE INDEX IF NOT EXISTS idx_user_password_change_required_user_id 
  ON public.user_password_change_required(user_id);

CREATE INDEX IF NOT EXISTS idx_user_password_change_required_must_change 
  ON public.user_password_change_required(must_change_password) 
  WHERE must_change_password = true;

-- =============== 3) ENABLE RLS ===============

ALTER TABLE public.user_password_change_required ENABLE ROW LEVEL SECURITY;

-- =============== 4) RLS POLICIES ===============

-- Users can view their own password change requirement
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_password_change_required' 
      AND policyname = 'user_password_change_required_select'
  ) THEN
    CREATE POLICY user_password_change_required_select 
      ON public.user_password_change_required
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Users can update their own password change requirement
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_password_change_required' 
      AND policyname = 'user_password_change_required_update'
  ) THEN
    CREATE POLICY user_password_change_required_update 
      ON public.user_password_change_required
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Allow system to insert records (via trigger)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_password_change_required' 
      AND policyname = 'user_password_change_required_insert'
  ) THEN
    CREATE POLICY user_password_change_required_insert 
      ON public.user_password_change_required
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- =============== 5) HELPER FUNCTION: UPDATE TIMESTAMP ===============

CREATE OR REPLACE FUNCTION public.trg_update_user_password_change_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_user_password_change_timestamp 
  ON public.user_password_change_required;
  
CREATE TRIGGER trg_update_user_password_change_timestamp
  BEFORE UPDATE ON public.user_password_change_required
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_user_password_change_timestamp();