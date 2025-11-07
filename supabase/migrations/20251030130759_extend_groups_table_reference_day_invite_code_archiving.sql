/*
  # Extend Groups Table - Reference Day, Invite Code & Archiving

  1. Columns Added to `groups`
    - `reference_day`: Day of the week for group's weekly reference (lundi to dimanche)
    - `invite_code`: 15-character invitation code [a-zA-Z0-9_-]
    - `invite_code_expires_at`: Expiration timestamp for invite code (48h validity)
    - `archived`: Boolean flag for soft delete
    - `archived_at`: Timestamp when group was archived
    - `archived_by`: User who archived the group
  
  2. Security
    - Invite codes are unique and indexed for fast lookups
    - Reference day is required for all new groups (defaults to 'mardi')
    - Archived groups are preserved with metadata
  
  3. Helper Functions
    - `generate_invite_code()`: Creates a secure 15-char random code
    - Auto-generates invite code on group creation (trigger)
  
  4. Notes
    - All operations are idempotent (safe to re-run)
    - Existing groups get default values (reference_day='mardi', archived=false)
    - Invite codes are case-sensitive and URL-safe
*/

-- =============== 1) CREATE ENUM FOR REFERENCE DAY ===============

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_of_week') THEN
    CREATE TYPE day_of_week AS ENUM (
      'lundi',
      'mardi',
      'mercredi',
      'jeudi',
      'vendredi',
      'samedi',
      'dimanche'
    );
  END IF;
END $$;

-- =============== 2) ADD COLUMNS TO GROUPS TABLE ===============

-- Reference day (default: mardi)
ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS reference_day day_of_week NOT NULL DEFAULT 'mardi';

-- Invite code (15 chars: a-zA-Z0-9_-)
ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS invite_code text;

-- Invite code expiration
ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS invite_code_expires_at timestamptz;

-- Archiving fields
ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============== 3) ADD CONSTRAINTS & INDEXES ===============

-- Ensure invite_code is unique if not null
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'groups_invite_code_unique'
  ) THEN
    ALTER TABLE public.groups 
      ADD CONSTRAINT groups_invite_code_unique 
      UNIQUE (invite_code);
  END IF;
END $$;

-- Ensure invite_code is exactly 15 chars and valid format
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'groups_invite_code_format'
  ) THEN
    ALTER TABLE public.groups 
      ADD CONSTRAINT groups_invite_code_format 
      CHECK (invite_code IS NULL OR (length(invite_code) = 15 AND invite_code ~ '^[a-zA-Z0-9_-]{15}$'));
  END IF;
END $$;

-- Index for fast invite code lookups
CREATE INDEX IF NOT EXISTS idx_groups_invite_code 
  ON public.groups(invite_code) 
  WHERE invite_code IS NOT NULL;

-- Index for archived groups
CREATE INDEX IF NOT EXISTS idx_groups_archived 
  ON public.groups(archived, archived_at);

-- =============== 4) HELPER FUNCTION: GENERATE INVITE CODE ===============

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  result text := '';
  i int;
  char_count int := length(chars);
BEGIN
  -- Generate 15 random characters
  FOR i IN 1..15 LOOP
    result := result || substr(chars, floor(random() * char_count + 1)::int, 1);
  END LOOP;
  
  RETURN result;
END;
$$;

-- =============== 5) TRIGGER: AUTO-GENERATE INVITE CODE ON GROUP CREATION ===============

CREATE OR REPLACE FUNCTION public.trg_groups_generate_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generate invite code if not provided
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
    NEW.invite_code_expires_at := now() + interval '48 hours';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_groups_generate_invite_code ON public.groups;
CREATE TRIGGER trg_groups_generate_invite_code
  BEFORE INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_groups_generate_invite_code();

-- =============== 6) BACKFILL EXISTING GROUPS WITH INVITE CODES ===============

DO $$
DECLARE
  v_group RECORD;
  v_new_code text;
  v_max_attempts int := 100;
  v_attempt int;
  v_code_exists boolean;
BEGIN
  FOR v_group IN 
    SELECT id FROM public.groups WHERE invite_code IS NULL
  LOOP
    v_attempt := 0;
    v_code_exists := true;
    
    -- Generate unique code with retry logic
    WHILE v_code_exists AND v_attempt < v_max_attempts LOOP
      v_new_code := public.generate_invite_code();
      
      SELECT EXISTS (
        SELECT 1 FROM public.groups WHERE invite_code = v_new_code
      ) INTO v_code_exists;
      
      v_attempt := v_attempt + 1;
    END LOOP;
    
    -- Update group with new code
    IF NOT v_code_exists THEN
      UPDATE public.groups
      SET 
        invite_code = v_new_code,
        invite_code_expires_at = now() + interval '48 hours'
      WHERE id = v_group.id;
    END IF;
  END LOOP;
END $$;