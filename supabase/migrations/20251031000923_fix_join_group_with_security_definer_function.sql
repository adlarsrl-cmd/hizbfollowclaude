/*
  # Fix join group with SECURITY DEFINER function
  
  1. Problem
    - RLS policies on group_members cause infinite recursion
    - INSERT policy reads group_members which triggers SELECT policy
    - SELECT policy calls check_user_in_group_members which reads group_members again
    - This creates an infinite loop: INSERT → SELECT → function → SELECT → ...
  
  2. Solution
    - Create a SECURITY DEFINER function to handle joining groups
    - This bypasses RLS completely and validates invite codes securely
    - Remove the problematic RLS policy that causes recursion
  
  3. Security
    - Function validates invite code, expiration, and archived status
    - Prevents duplicate memberships
    - Auto-creates participant via trigger (already has SECURITY DEFINER)
    - Users can only join as 'member' role
*/

-- Drop the problematic INSERT policy that causes recursion
DROP POLICY IF EXISTS "gm_insert" ON group_members;

-- Create secure function to join groups
CREATE OR REPLACE FUNCTION public.join_group_with_invite_code(
  p_invite_code TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_group_id UUID;
  v_group_name TEXT;
  v_member_exists BOOLEAN;
  v_member_id UUID;
BEGIN
  -- Validate and get group info
  SELECT id, name INTO v_group_id, v_group_name
  FROM groups
  WHERE invite_code = p_invite_code
    AND invite_code_expires_at > now()
    AND archived = false;
  
  -- Check if group exists and invite is valid
  IF v_group_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code d''invitation invalide ou expiré'
    );
  END IF;
  
  -- Check if user is already a member
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id
      AND user_id = p_user_id
  ) INTO v_member_exists;
  
  IF v_member_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vous êtes déjà membre de ce groupe'
    );
  END IF;
  
  -- Insert the new member
  INSERT INTO group_members (
    group_id,
    user_id,
    role,
    can_write_self
  ) VALUES (
    v_group_id,
    p_user_id,
    'member',
    true
  )
  RETURNING id INTO v_member_id;
  
  -- Return success with group info
  RETURN json_build_object(
    'success', true,
    'group_id', v_group_id,
    'group_name', v_group_name,
    'member_id', v_member_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.join_group_with_invite_code IS 
'Securely join a group using an invite code. Bypasses RLS to avoid recursion issues.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_group_with_invite_code TO authenticated;

-- Keep the self-join policy for INSERT (simplified, no recursion)
CREATE POLICY "gm_insert_self_member"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND role = 'member'
  );
