/*
  # Fix Function Search Paths for Security (v2)

  1. Security Enhancement
    - Add `SET search_path = public` to all functions
    - Prevents malicious users from hijacking function behavior via schema manipulation
    - Essential security best practice for PostgreSQL functions

  2. Functions Updated
    - handle_new_user
    - generate_invite_code
    - trg_groups_generate_invite_code
    - trg_update_user_password_change_timestamp
    - get_user_role_in_group
    - user_is_in_group
    - generate_unique_participant_name
    - update_updated_at_column
    - trg_groups_owner
    - rpc_update_weekly_snapshot
    - assign_admin_role

  3. Notes
    - Each function is dropped first, then recreated with secure search_path
    - Functions maintain same logic but with improved security
*/

-- ============================================================================
-- Drop existing functions first
-- ============================================================================

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS generate_invite_code() CASCADE;
DROP FUNCTION IF EXISTS trg_groups_generate_invite_code() CASCADE;
DROP FUNCTION IF EXISTS trg_update_user_password_change_timestamp() CASCADE;
DROP FUNCTION IF EXISTS get_user_role_in_group(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS user_is_in_group(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_unique_participant_name(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS trg_groups_owner() CASCADE;
DROP FUNCTION IF EXISTS rpc_update_weekly_snapshot(UUID, INTEGER, INTEGER, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS assign_admin_role(UUID) CASCADE;

-- ============================================================================
-- Recreate functions with secure search_path
-- ============================================================================

-- handle_new_user: Create user profile on signup
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- generate_invite_code: Generate unique 6-character invite codes
CREATE FUNCTION generate_invite_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.groups WHERE invite_code = result) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$;

-- trg_groups_generate_invite_code: Trigger to auto-generate invite codes
CREATE FUNCTION trg_groups_generate_invite_code()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

-- trg_update_user_password_change_timestamp: Track password changes
CREATE FUNCTION trg_update_user_password_change_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_password_change_required
  SET last_password_change = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- get_user_role_in_group: Get user's role in a specific group
CREATE FUNCTION get_user_role_in_group(
  p_user_id UUID,
  p_group_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.group_members
  WHERE user_id = p_user_id
  AND group_id = p_group_id;
  
  RETURN v_role;
END;
$$;

-- user_is_in_group: Check if user is a member of a group
CREATE FUNCTION user_is_in_group(
  p_user_id UUID,
  p_group_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = p_user_id
    AND group_id = p_group_id
  );
END;
$$;

-- generate_unique_participant_name: Generate unique participant names
CREATE FUNCTION generate_unique_participant_name(
  p_group_id UUID,
  p_base_name TEXT
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_counter INTEGER := 1;
  v_new_name TEXT;
  v_exists BOOLEAN;
BEGIN
  v_new_name := p_base_name;
  
  LOOP
    SELECT EXISTS(
      SELECT 1
      FROM public.participants
      WHERE group_id = p_group_id
      AND name = v_new_name
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    
    v_counter := v_counter + 1;
    v_new_name := p_base_name || ' ' || v_counter;
  END LOOP;
  
  RETURN v_new_name;
END;
$$;

-- update_updated_at_column: Generic trigger to update updated_at timestamps
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- trg_groups_owner: Ensure group creator becomes owner
CREATE FUNCTION trg_groups_owner()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

-- rpc_update_weekly_snapshot: Update or create weekly snapshot
CREATE FUNCTION rpc_update_weekly_snapshot(
  p_participant_id UUID,
  p_year INTEGER,
  p_week INTEGER,
  p_total_hizb NUMERIC
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  INSERT INTO public.weekly_snapshots (
    participant_id,
    year,
    week_number,
    total_hizb,
    recorded_at
  )
  VALUES (
    p_participant_id,
    p_year,
    p_week,
    p_total_hizb,
    NOW()
  )
  ON CONFLICT (participant_id, year, week_number)
  DO UPDATE SET
    total_hizb = EXCLUDED.total_hizb,
    recorded_at = NOW()
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

-- assign_admin_role: Assign admin role to user (for initial setup)
CREATE FUNCTION assign_admin_role(p_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
END;
$$;

-- ============================================================================
-- Recreate triggers that depend on these functions
-- ============================================================================

-- Trigger for new user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger for invite code generation
DROP TRIGGER IF EXISTS trg_groups_invite_code ON groups;
CREATE TRIGGER trg_groups_invite_code
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION trg_groups_generate_invite_code();

-- Trigger for password change tracking
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION trg_update_user_password_change_timestamp();

-- Trigger for updated_at timestamp (multiple tables)
DROP TRIGGER IF EXISTS set_updated_at ON groups;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON participants;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON group_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON group_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for auto-adding group owner
DROP TRIGGER IF EXISTS trg_groups_owner_after_insert ON groups;
CREATE TRIGGER trg_groups_owner_after_insert
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION trg_groups_owner();
