/*
  # Remove user_profiles dependency from trigger completely
  
  1. Problem
    - Even with try/catch, accessing user_profiles causes 42P17 error
    - RLS policies interfere with SECURITY DEFINER context
  
  2. Solution
    - Remove all references to user_profiles
    - Use only auth.users for email
    - Use email prefix as display name
  
  3. Security
    - Simpler, more reliable
    - No RLS issues
*/

CREATE OR REPLACE FUNCTION public.auto_create_participant_on_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_display_name text;
  v_email text;
  v_owner_id uuid;
  v_participant_exists boolean;
BEGIN
  -- Check if participant already exists
  SELECT EXISTS (
    SELECT 1 FROM participants
    WHERE group_id = NEW.group_id
      AND user_id = NEW.user_id
  ) INTO v_participant_exists;
  
  IF NOT v_participant_exists THEN
    -- Get group owner_id
    SELECT owner_id INTO v_owner_id
    FROM groups
    WHERE id = NEW.group_id;
    
    -- Get email from auth.users
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Use email prefix as display name
    v_display_name := COALESCE(
      split_part(v_email, '@', 1),
      'Participant'
    );
    
    -- Create participant
    INSERT INTO participants (
      group_id,
      user_id,
      owner_id,
      name,
      email,
      active,
      cycle_number,
      weekly_target_hizb
    ) VALUES (
      NEW.group_id,
      NEW.user_id,
      v_owner_id,
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

COMMENT ON FUNCTION public.auto_create_participant_on_join() IS 
'Automatically creates participant when user joins a group. Uses only auth.users to avoid RLS issues.';
