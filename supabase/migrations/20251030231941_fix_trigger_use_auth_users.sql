/*
  # Fix trigger to use auth.users instead of user_profiles
  
  1. Problem
    - Trigger tries to read user_profiles with SECURITY DEFINER
    - RLS policies on user_profiles block access in trigger context
    - This causes error 42P17
  
  2. Solution
    - Read directly from auth.users (no RLS issues)
    - Only use display_name from user_profiles if available
    - Fallback to email prefix
  
  3. Security
    - Maintains SECURITY DEFINER
    - auth.users is accessible in SECURITY DEFINER context
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
  -- Check if participant already exists
  SELECT EXISTS (
    SELECT 1 FROM public.participants
    WHERE group_id = NEW.group_id
      AND user_id = NEW.user_id
  ) INTO v_participant_exists;
  
  IF NOT v_participant_exists THEN
    -- Get group owner_id
    SELECT owner_id INTO v_owner_id
    FROM public.groups
    WHERE id = NEW.group_id;
    
    -- Get email from auth.users (always accessible)
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Try to get display_name from user_profiles (may fail due to RLS)
    BEGIN
      SELECT display_name INTO v_display_name
      FROM public.user_profiles
      WHERE user_id = NEW.user_id;
    EXCEPTION WHEN OTHERS THEN
      v_display_name := NULL;
    END;
    
    -- Use display_name or email prefix as name
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
