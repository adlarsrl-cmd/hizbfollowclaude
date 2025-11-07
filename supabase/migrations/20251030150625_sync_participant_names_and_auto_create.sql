/*
  # Synchronize Participant Names and Auto-Create Participants

  1. Purpose
    - Implement workflow where participants are ONLY created when user joins a group
    - Synchronize participant names with user_profiles.display_name
    - Auto-link participants to users by email when applicable

  2. New Functions & Triggers
    - sync_participant_name_from_profile: Updates all participant names when user changes display_name
    - auto_create_participant_on_join: Creates participant automatically when user joins group
    - auto_link_participant_to_user: Links participant to user if email matches
  
  3. Workflow Changes
    - User signs up → user_profiles created (NO participant yet)
    - User joins group → group_member created → participant auto-created with user_id and display_name
    - Owner adds participant with email → checks if user exists → auto-links if found
    - User changes display_name → all participants sync automatically

  4. Security
    - All functions run with SECURITY DEFINER for cross-schema access
    - Maintains existing RLS policies
*/

-- =============== 1) SYNC PARTICIPANT NAME FROM USER PROFILE ===============

CREATE OR REPLACE FUNCTION public.sync_participant_name_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When user updates their display_name, sync all their participants
  IF (OLD.display_name IS DISTINCT FROM NEW.display_name) AND NEW.display_name IS NOT NULL THEN
    UPDATE public.participants
    SET name = NEW.display_name,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_sync_participant_name_from_profile ON public.user_profiles;

-- Create trigger on user_profiles
CREATE TRIGGER trg_sync_participant_name_from_profile
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  WHEN (OLD.display_name IS DISTINCT FROM NEW.display_name)
  EXECUTE FUNCTION public.sync_participant_name_from_profile();

COMMENT ON FUNCTION public.sync_participant_name_from_profile() IS 
'Synchronizes participant names across all groups when user updates display_name';

-- =============== 2) AUTO-CREATE PARTICIPANT ON GROUP JOIN ===============

CREATE OR REPLACE FUNCTION public.auto_create_participant_on_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_email text;
  v_participant_exists boolean;
BEGIN
  -- Check if participant already exists for this user in this group
  SELECT EXISTS (
    SELECT 1 FROM public.participants
    WHERE group_id = NEW.group_id
      AND user_id = NEW.user_id
  ) INTO v_participant_exists;
  
  -- Only create if participant doesn't exist
  IF NOT v_participant_exists THEN
    -- Get user's display_name and email from user_profiles
    SELECT display_name, email 
    INTO v_display_name, v_email
    FROM public.user_profiles
    WHERE user_id = NEW.user_id;
    
    -- Get email from auth.users if not in user_profiles
    IF v_email IS NULL THEN
      SELECT email INTO v_email
      FROM auth.users
      WHERE id = NEW.user_id;
    END IF;
    
    -- Use display_name or email prefix as fallback
    IF v_display_name IS NULL OR v_display_name = '' THEN
      v_display_name := COALESCE(
        split_part(v_email, '@', 1),
        'Participant'
      );
    END IF;
    
    -- Create participant
    INSERT INTO public.participants (
      group_id,
      user_id,
      name,
      email,
      active,
      cycle_number,
      weekly_target_hizb
    ) VALUES (
      NEW.group_id,
      NEW.user_id,
      v_display_name,
      v_email,
      true,
      0,
      7
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_create_participant_on_join ON public.group_members;

-- Create trigger on group_members
CREATE TRIGGER trg_auto_create_participant_on_join
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_participant_on_join();

COMMENT ON FUNCTION public.auto_create_participant_on_join() IS 
'Automatically creates participant when user joins a group via group_members';

-- =============== 3) AUTO-LINK PARTICIPANT TO USER BY EMAIL ===============

CREATE OR REPLACE FUNCTION public.auto_link_participant_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_display_name text;
BEGIN
  -- Only process if participant has email but no user_id
  IF NEW.email IS NOT NULL AND NEW.email != '' AND NEW.user_id IS NULL THEN
    
    -- Look for existing user with this email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    -- If user found, link them
    IF v_user_id IS NOT NULL THEN
      NEW.user_id := v_user_id;
      
      -- Also update participant name to match user's display_name
      SELECT display_name INTO v_display_name
      FROM public.user_profiles
      WHERE user_id = v_user_id;
      
      IF v_display_name IS NOT NULL AND v_display_name != '' THEN
        NEW.name := v_display_name;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_link_participant_to_user ON public.participants;

-- Create trigger on participants (BEFORE INSERT or UPDATE)
CREATE TRIGGER trg_auto_link_participant_to_user
  BEFORE INSERT OR UPDATE ON public.participants
  FOR EACH ROW
  WHEN (NEW.email IS NOT NULL AND NEW.email != '')
  EXECUTE FUNCTION public.auto_link_participant_to_user();

COMMENT ON FUNCTION public.auto_link_participant_to_user() IS 
'Automatically links participant to user account if email matches existing user';

-- =============== 4) HELPER: SYNC EXISTING PARTICIPANTS ===============

-- Sync existing participants that have email but no user_id
DO $$
DECLARE
  rec RECORD;
  v_user_id uuid;
  v_display_name text;
BEGIN
  FOR rec IN 
    SELECT id, email 
    FROM public.participants 
    WHERE email IS NOT NULL 
      AND email != '' 
      AND user_id IS NULL
  LOOP
    -- Find matching user
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE u.email = rec.email
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      -- Get display name
      SELECT display_name INTO v_display_name
      FROM public.user_profiles
      WHERE user_id = v_user_id;
      
      -- Update participant
      UPDATE public.participants
      SET user_id = v_user_id,
          name = COALESCE(v_display_name, name),
          updated_at = now()
      WHERE id = rec.id;
      
      RAISE NOTICE 'Linked participant % to user %', rec.id, v_user_id;
    END IF;
  END LOOP;
END $$;