/*
  # Allow members to create their own participant

  1. Changes
    - Add RLS policy to allow group members to create their own participant entry
    - Members can only create a participant linked to their own user_id
    - Must be a member of the group they're creating a participant for
  
  2. Security
    - Users can only create participants for themselves (user_id = auth.uid())
    - Must be a member of the target group
    - Cannot create participants for other users
*/

-- Allow members to create their own participant when joining a group
CREATE POLICY "participants_insert_self"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members m
      WHERE m.group_id = participants.group_id
        AND m.user_id = auth.uid()
    )
  );
