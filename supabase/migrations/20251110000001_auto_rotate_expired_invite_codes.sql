/*
  # Auto-Rotate Expired Invite Codes
  
  This function automatically regenerates invite codes that have expired.
  It should be called when fetching groups to ensure invite codes are always fresh.
  
  The function:
  1. Finds groups with expired invite codes (invite_code_expires_at < NOW())
  2. Generates new unique invite codes
  3. Sets new expiration (48 hours from now)
  4. Updates the groups
*/

CREATE OR REPLACE FUNCTION public.rotate_expired_invite_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_new_code text;
  v_max_attempts int := 100;
  v_attempt int;
  v_code_exists boolean;
BEGIN
  -- Find groups with expired invite codes
  FOR v_group IN 
    SELECT id, invite_code
    FROM public.groups 
    WHERE invite_code IS NOT NULL
      AND (invite_code_expires_at IS NULL OR invite_code_expires_at < NOW())
      AND archived = false
  LOOP
    v_attempt := 0;
    v_code_exists := true;
    
    -- Generate unique code with retry logic
    WHILE v_code_exists AND v_attempt < v_max_attempts LOOP
      v_new_code := public.generate_invite_code();
      
      -- Check if code already exists (excluding current group's code)
      SELECT EXISTS (
        SELECT 1 FROM public.groups 
        WHERE invite_code = v_new_code 
          AND id != v_group.id
      ) INTO v_code_exists;
      
      v_attempt := v_attempt + 1;
    END LOOP;
    
    -- Update group with new code if we found a unique one
    IF NOT v_code_exists THEN
      UPDATE public.groups
      SET 
        invite_code = v_new_code,
        invite_code_expires_at = NOW() + interval '48 hours'
      WHERE id = v_group.id;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rotate_expired_invite_codes() TO authenticated;

COMMENT ON FUNCTION public.rotate_expired_invite_codes() IS 
'Automatically regenerates invite codes for groups that have expired codes. Should be called when fetching groups to ensure codes are always fresh.';

