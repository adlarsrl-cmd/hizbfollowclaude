/*
  # Fix RLS Recursion with Security Definer Function

  1. Problem
    - Even the simplified gm_select policy still has recursion
    - Any subquery on group_members within a group_members policy creates recursion
  
  2. Solution
    - Use SECURITY DEFINER function to bypass RLS during checks
    - Function runs with elevated privileges and returns true/false
    - Policy uses function result without recursion
  
  3. Critical
    - SECURITY DEFINER functions must be carefully designed for security
    - This function ONLY checks membership, no data exposure
*/

-- =============== DROP OLD PROBLEMATIC POLICY ===============

DROP POLICY IF EXISTS gm_select ON public.group_members;

-- =============== CREATE SECURITY DEFINER HELPER FUNCTION ===============

CREATE OR REPLACE FUNCTION public.user_is_in_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id 
      AND user_id = auth.uid()
  );
$$;

-- =============== CREATE NEW NON-RECURSIVE POLICY ===============

-- Allow users to see their own memberships directly (no recursion)
-- OR see members of groups they belong to (using SECURITY DEFINER function)
CREATE POLICY gm_select ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check: user sees their own membership (no recursion)
    user_id = auth.uid()
    OR
    -- Check via SECURITY DEFINER function (bypasses RLS)
    public.user_is_in_group(group_id)
  );

COMMENT ON FUNCTION public.user_is_in_group IS 
'SECURITY DEFINER function to check if current user is member of a group. 
Bypasses RLS to prevent infinite recursion in policies.';

COMMENT ON POLICY gm_select ON public.group_members IS 
'Allow users to view their own memberships and members of groups they belong to. 
Uses SECURITY DEFINER function to avoid infinite recursion.';