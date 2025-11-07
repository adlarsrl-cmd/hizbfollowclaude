/*
  # Fix auto-create participant trigger to set owner_id

  1. Problem
    - Trigger auto_create_participant_on_join doesn't set owner_id
    - owner_id is NOT NULL but trigger runs with SECURITY DEFINER
    - This causes "null value in column owner_id" error
  
  2. Solution
    - Get group owner_id from groups table
    - Set owner_id explicitly in INSERT statement
  
  3. Security
    - Maintains SECURITY DEFINER for cross-schema access
    - Uses group owner as participant owner (logical ownership)
*/

CREATE OR REPLACE FUNCTION public.auto_create_participant_on_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_email text;
  v_owner_id uuid;
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
    -- Get group owner_id
    SELECT owner_id INTO v_owner_id
    FROM public.groups
    WHERE id = NEW.group_id;
    
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
    
    -- Create participant with explicit owner_id
    INSERT INTO public.participants (
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
'Automatically creates participant with proper owner_id when user joins a group via group_members';
