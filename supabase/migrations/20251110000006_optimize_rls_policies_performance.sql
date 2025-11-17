/*
  # Optimize RLS Policies Performance
  
  This migration optimizes RLS policies by wrapping auth.uid() calls in SELECT.
  This prevents re-evaluation for each row, improving query performance.
  
  ⚠️ SAFE: Only changes policy expressions, maintains same security behavior
  ⚠️ REVERSIBLE: Can revert to original if needed
  
  Impact: Low risk - same security, better performance
  Performance: Significantly improves query speed at scale
*/

-- Optimize group_members policies
DROP POLICY IF EXISTS "gm_insert_self_member" ON public.group_members;
CREATE POLICY "gm_insert_self_member" ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "gm_insert_self_with_invite_code" ON public.group_members;
CREATE POLICY "gm_insert_self_with_invite_code" ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id
      AND g.invite_code IS NOT NULL
    )
  );

-- Optimize user_profiles policies
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (deleted_at IS NULL OR (SELECT auth.uid()) = user_id)
  );

DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id 
    AND deleted_at IS NULL
  );

