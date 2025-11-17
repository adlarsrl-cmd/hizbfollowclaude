/*
  # Add deleted_at column to user_profiles for account deletion
  
  This allows us to soft-delete accounts and prevent users from logging in
  after they delete their account, while keeping the auth.users record
  for audit purposes or eventual permanent deletion by admin.
*/

-- Add deleted_at column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at 
ON public.user_profiles(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Update RLS policy to prevent deleted users from accessing their profile
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL OR auth.uid() = user_id);

-- Users can't update their profile if deleted
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id AND deleted_at IS NULL);

