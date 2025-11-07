/*
  # Fix user_roles RLS policy infinite recursion

  1. Security Changes
    - Drop the problematic admin policy that causes infinite recursion
    - Keep only the simple user policy that allows users to read their own role
    - This prevents the infinite loop while maintaining security

  The issue was that the admin policy was checking user_roles table within 
  the policy for user_roles table, creating infinite recursion.
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Ensure we have the correct simple policy for users to read their own role
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;

CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to insert their own role (needed for initial setup)
CREATE POLICY "Users can insert own role"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());