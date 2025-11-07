/*
  # Fix RLS Infinite Recursion in group_members

  1. Problem
    - The gm_select policy queries group_members within its own USING clause
    - This creates infinite recursion: policy checks → query group_members → policy checks → ...
    - Results in users unable to see any groups

  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS
    - Use this function in the policy to break the recursion
    - The function safely checks membership without triggering RLS

  3. Security
    - Function only checks if user_id matches or if user is in same group
    - No sensitive data exposed
    - Same logic as before, just executed without RLS recursion

  4. Notes
    - This is a common PostgreSQL RLS pattern for self-referencing policies
    - SECURITY DEFINER is safe here because logic is simple and auditable
*/

-- ============================================================================
-- CREATE HELPER FUNCTION TO CHECK GROUP MEMBERSHIP (BYPASSES RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_user_in_group_members(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
    AND user_id = p_user_id
  );
END;
$$;

COMMENT ON FUNCTION check_user_in_group_members IS
'SECURITY DEFINER helper function to check group membership without triggering RLS.
Used to break infinite recursion in group_members RLS policies.
This is a standard pattern for self-referencing RLS policies in PostgreSQL.';

-- ============================================================================
-- RECREATE gm_select POLICY WITHOUT RECURSION
-- ============================================================================

DROP POLICY IF EXISTS gm_select ON group_members;

CREATE POLICY gm_select ON group_members
FOR SELECT TO authenticated
USING (
  -- Allow users to see their own membership records
  user_id = (select auth.uid())
  OR
  -- Allow users to see other members of groups they belong to
  -- Use SECURITY DEFINER function to avoid recursion
  check_user_in_group_members(group_members.group_id, (select auth.uid()))
);

COMMENT ON POLICY gm_select ON group_members IS
'Allows users to see their own group memberships and other members of groups they belong to.
Uses check_user_in_group_members() SECURITY DEFINER function to avoid RLS recursion.';
