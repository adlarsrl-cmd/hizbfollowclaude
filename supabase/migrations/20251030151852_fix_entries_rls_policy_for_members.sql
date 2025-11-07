/*
  # Fix Entries RLS Policy for Members

  1. Problem
    - Members cannot see their own entries because the policy checks `entries.owner_id = auth.uid()`
    - But entries are created by admins/managers, so owner_id is the admin's ID
    - Members should see entries where the participant.user_id matches their ID

  2. Solution
    - Update entries_select policy to check participant.user_id instead of entries.owner_id
    - Keep the same logic for owners/managers (see all) but fix for members/viewers

  3. Security
    - Members/viewers can only see entries linked to their own participant records
    - Owners/managers still see all entries in their groups
*/

-- =============== FIX ENTRIES SELECT POLICY ===============

DROP POLICY IF EXISTS entries_select ON public.entries;

CREATE POLICY entries_select ON public.entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = entries.group_id 
        AND m.user_id = auth.uid()
        AND (
          -- Owners and managers see all entries
          m.role IN ('owner', 'manager')
          OR
          -- Members and viewers see only entries for their own participant
          (
            m.role IN ('member', 'viewer') 
            AND EXISTS (
              SELECT 1 FROM public.participants p
              WHERE p.id = entries.participant_id
                AND p.user_id = auth.uid()
            )
          )
        )
    )
  );

COMMENT ON POLICY entries_select ON public.entries IS 
'Members can view entries linked to their participant record via participant.user_id';