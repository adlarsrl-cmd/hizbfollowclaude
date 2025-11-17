-- Temporarily drop the rotate_expired_invite_codes function to fix login issue
-- We'll recreate it later once we fix the issue

DROP FUNCTION IF EXISTS public.rotate_expired_invite_codes() CASCADE;

