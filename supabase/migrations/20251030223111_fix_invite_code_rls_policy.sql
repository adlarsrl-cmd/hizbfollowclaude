/*
  # Fix invite code RLS policy

  1. Problem
    - Current policy only checks if invite_code IS NOT NULL
    - Doesn't validate if code is expired or if group is archived
  
  2. Solution
    - Drop and recreate policy with proper validation
    - Check invite_code_expires_at > NOW()
    - Check archived = false
  
  3. Security
    - Users can only join non-archived groups
    - Users can only join with valid, non-expired invite codes
    - Users can only assign themselves as 'member'
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "gm_insert_self_with_invite_code" ON group_members;

-- Recreate with proper validation
CREATE POLICY "gm_insert_self_with_invite_code"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
    AND EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
        AND groups.invite_code IS NOT NULL
        AND groups.invite_code_expires_at > NOW()
        AND groups.archived = false
    )
  );

COMMENT ON POLICY "gm_insert_self_with_invite_code" ON group_members IS 
'Allows authenticated users to join groups using valid invite codes';
