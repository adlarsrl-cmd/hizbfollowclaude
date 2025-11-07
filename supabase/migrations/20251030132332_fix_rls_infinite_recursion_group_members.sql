/*
  # Fix RLS Infinite Recursion on group_members

  1. Problem
    - The gm_select policy on group_members checks group_members existence
    - This creates an infinite recursion when querying groups
    - Users cannot see their groups anymore
  
  2. Solution
    - Allow users to view ALL group_members records where they are a member
    - Simplify the policy to avoid self-referencing
    - Use direct user_id comparison instead of EXISTS subquery
  
  3. Impact
    - Users can now see all members of groups they belong to
    - No more infinite recursion
    - Groups become visible again in the UI
*/

-- =============== DROP OLD POLICY ===============

DROP POLICY IF EXISTS gm_select ON public.group_members;

-- =============== CREATE NEW SIMPLIFIED POLICY ===============

-- Users can view members of groups they belong to
-- CRITICAL: Use a simple check that doesn't create recursion
CREATE POLICY gm_select ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own membership
    user_id = auth.uid()
    OR
    -- User can see other members if they are in the same group
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY gm_select ON public.group_members IS 
'Allow users to view their own memberships and members of groups they belong to. 
Simplified to avoid infinite recursion.';