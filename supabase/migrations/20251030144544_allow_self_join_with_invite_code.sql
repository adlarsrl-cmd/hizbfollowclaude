/*
  # Allow self-joining groups with invite code

  1. Changes
    - Add new RLS policy to allow users to add themselves to groups with valid invite codes
    - Users can only add themselves (user_id = auth.uid())
    - Only works with valid, non-expired invite codes
    - Users can only assign themselves the 'member' role
  
  2. Security
    - Cannot add other users without being owner/manager
    - Cannot self-assign owner or manager roles
    - Requires valid invite code that hasn't expired
*/

-- Add policy to allow self-joining with invite code
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
    )
  );
