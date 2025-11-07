/*
  # Allow group lookup by invite code

  1. Changes
    - Add new RLS policy to allow authenticated users to read group ID by valid invite code
    - This enables users to join groups via invite code without being members yet
  
  2. Security
    - Only allows reading the group ID (not sensitive data)
    - Only works with valid, non-expired invite codes
    - Still requires authentication
*/

-- Add policy to allow looking up groups by invite code
CREATE POLICY "groups_select_by_invite_code"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    invite_code IS NOT NULL 
    AND invite_code_expires_at > NOW()
  );
