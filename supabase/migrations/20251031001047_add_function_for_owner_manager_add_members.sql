/*
  # Add function for owners/managers to add members
  
  1. Problem
    - addMember function in frontend tries to INSERT into group_members
    - Without proper RLS policy, this will fail or cause recursion
  
  2. Solution
    - Create SECURITY DEFINER function for owners/managers to add members
    - Validates that caller is owner/manager
    - Prevents duplicate memberships
  
  3. Security
    - Checks caller has owner/manager role
    - Auto-creates participant via existing trigger
*/

CREATE OR REPLACE FUNCTION public.add_member_to_group(
  p_group_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_caller_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_member_exists BOOLEAN;
  v_member_id UUID;
BEGIN
  -- Check if caller has permission (owner or manager)
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = p_group_id
    AND user_id = p_caller_user_id;
  
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'manager') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permission denied: You must be an owner or manager'
    );
  END IF;
  
  -- Check if user is already a member
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  ) INTO v_member_exists;
  
  IF v_member_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is already a member of this group'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('owner', 'manager', 'member', 'viewer') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role'
    );
  END IF;
  
  -- Insert the new member
  INSERT INTO group_members (
    group_id,
    user_id,
    role,
    can_write_self
  ) VALUES (
    p_group_id,
    p_user_id,
    p_role,
    true
  )
  RETURNING id INTO v_member_id;
  
  RETURN json_build_object(
    'success', true,
    'member_id', v_member_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.add_member_to_group IS 
'Allows owners/managers to add members to a group. Bypasses RLS to avoid recursion.';

GRANT EXECUTE ON FUNCTION public.add_member_to_group TO authenticated;
