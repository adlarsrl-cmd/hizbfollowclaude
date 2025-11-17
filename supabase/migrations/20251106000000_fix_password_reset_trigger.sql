/*
  # Fix Password Change Tracking Trigger
  
  The trigger function trg_update_user_password_change_timestamp() was trying to update
  a column called 'last_password_change' which doesn't exist. The correct column name
  is 'password_changed_at'.
  
  This was causing 500 errors when users tried to reset their passwords.
*/

-- Fix the trigger function to use the correct column name
CREATE OR REPLACE FUNCTION trg_update_user_password_change_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update password_changed_at and set must_change_password to false
  UPDATE public.user_password_change_required
  SET 
    password_changed_at = NOW(),
    must_change_password = false
  WHERE user_id = NEW.id;
  
  -- If no row exists, create one (for users who weren't auto-created)
  IF NOT FOUND THEN
    INSERT INTO public.user_password_change_required (user_id, must_change_password, password_changed_at)
    VALUES (NEW.id, false, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      password_changed_at = NOW(),
      must_change_password = false;
  END IF;
  
  RETURN NEW;
END;
$$;

