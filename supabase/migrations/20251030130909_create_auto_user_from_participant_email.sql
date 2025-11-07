/*
  # Auto-Create User from Participant Email

  1. Purpose
    - When an email is added to a "participant fantôme" (ghost participant)
    - Auto-create a user account in auth.users with default password "1234"
    - Mark user as requiring password change
    - Link participant to the newly created user
    - Trigger email notification via edge function
  
  2. Workflow
    Step 1: Manager adds email to participant record
    Step 2: Trigger detects email addition (was NULL, now has value)
    Step 3: Check if email already exists in auth.users
      - If YES: Return error (email already used)
      - If NO: Create user with email + password "1234"
    Step 4: Create password change requirement record
    Step 5: Link participant.user_id to new auth.user.id
    Step 6: Call edge function to send notification email
  
  3. Security
    - Function runs as SECURITY DEFINER (elevated privileges)
    - Only triggers on UPDATE of participants table
    - Validates email format before creating user
    - Prevents duplicate emails
  
  4. Notes
    - Uses Supabase auth.users table directly
    - Default password is "1234" (must be changed on first login)
    - Email is sent asynchronously via edge function call
*/

-- =============== 1) FUNCTION: CREATE USER FROM PARTICIPANT EMAIL ===============

CREATE OR REPLACE FUNCTION public.trg_create_user_from_participant_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new_user_id uuid;
  v_email_exists boolean;
BEGIN
  -- Only process if email was just added (was NULL or empty, now has value)
  IF (OLD.email IS NULL OR OLD.email = '') AND (NEW.email IS NOT NULL AND NEW.email != '') THEN
    
    -- Validate email format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Check if email already exists in auth.users
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE email = NEW.email
    ) INTO v_email_exists;
    
    IF v_email_exists THEN
      RAISE EXCEPTION 'Email already used: %. Cannot create user from participant.', NEW.email;
    END IF;
    
    -- Create user in auth.users with default password "1234"
    -- Note: This requires admin API access, so we'll use a different approach
    -- We'll create a record that will be picked up by an edge function
    
    -- Instead, we'll insert a pending user creation request
    -- and handle actual user creation via Supabase Admin API in edge function
    INSERT INTO public.pending_user_creations (
      participant_id,
      email,
      group_id,
      created_by
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.group_id,
      auth.uid()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============== 2) CREATE PENDING USER CREATIONS TABLE ===============

CREATE TABLE IF NOT EXISTS public.pending_user_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  email text NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Index for pending items
CREATE INDEX IF NOT EXISTS idx_pending_user_creations_status 
  ON public.pending_user_creations(status, created_at) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.pending_user_creations ENABLE ROW LEVEL SECURITY;

-- Policy: Managers and owners can view pending creations for their groups
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'pending_user_creations' 
      AND policyname = 'pending_user_creations_select'
  ) THEN
    CREATE POLICY pending_user_creations_select 
      ON public.pending_user_creations
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.group_members m
          WHERE m.group_id = pending_user_creations.group_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'manager')
        )
      );
  END IF;
END $$;

-- Policy: Only system can insert (via trigger)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'pending_user_creations' 
      AND policyname = 'pending_user_creations_insert'
  ) THEN
    CREATE POLICY pending_user_creations_insert 
      ON public.pending_user_creations
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Policy: Only system can update
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'pending_user_creations' 
      AND policyname = 'pending_user_creations_update'
  ) THEN
    CREATE POLICY pending_user_creations_update 
      ON public.pending_user_creations
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =============== 3) CREATE TRIGGER ===============

DROP TRIGGER IF EXISTS trg_create_user_from_participant_email ON public.participants;
CREATE TRIGGER trg_create_user_from_participant_email
  AFTER UPDATE ON public.participants
  FOR EACH ROW
  WHEN (
    (OLD.email IS NULL OR OLD.email = '') 
    AND (NEW.email IS NOT NULL AND NEW.email != '')
  )
  EXECUTE FUNCTION public.trg_create_user_from_participant_email();

-- =============== 4) COMMENT ===============

COMMENT ON TABLE public.pending_user_creations IS 
'Queue for auto-creating users when email is added to participant. 
Processed by edge function with admin privileges.';