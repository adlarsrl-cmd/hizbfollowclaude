/*
  # Fix Remaining Function Search Paths

  1. Security Enhancement
    - Fix remaining functions that have mutable search_path
    - Add explicit `SET search_path = public` to all versions

  2. Functions Fixed
    - user_is_in_group (2 versions)
    - generate_unique_participant_name (2 versions)
    - rpc_update_weekly_snapshot (2 versions)
    - assign_admin_role (2 versions)

  3. Notes
    - All function versions must be dropped and recreated
    - Preserves all function logic, only adds security
*/

-- ============================================================================
-- DROP ALL VERSIONS OF FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS user_is_in_group(UUID);
DROP FUNCTION IF EXISTS user_is_in_group(UUID, UUID);
DROP FUNCTION IF EXISTS generate_unique_participant_name();
DROP FUNCTION IF EXISTS generate_unique_participant_name(UUID, TEXT);
DROP FUNCTION IF EXISTS rpc_update_weekly_snapshot(UUID, INTEGER, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS rpc_update_weekly_snapshot(UUID, TEXT, INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS assign_admin_role(TEXT);
DROP FUNCTION IF EXISTS assign_admin_role(UUID);

-- ============================================================================
-- RECREATE FUNCTIONS WITH SECURE SEARCH_PATH
-- ============================================================================

-- user_is_in_group: Check if current user is in a group (1 parameter)
CREATE FUNCTION user_is_in_group(p_group_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = auth.uid()
    AND group_id = p_group_id
  );
END;
$$;

-- user_is_in_group: Check if specific user is in a group (2 parameters)
CREATE FUNCTION user_is_in_group(p_user_id UUID, p_group_id UUID)
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

-- generate_unique_participant_name: Generate unique name with auto-increment (0 parameters)
CREATE FUNCTION generate_unique_participant_name()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_base TEXT := 'Participant';
  v_counter INTEGER := 1;
  v_name TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_name := v_base || ' ' || v_counter;
    
    SELECT EXISTS(
      SELECT 1 FROM public.participants WHERE name = v_name
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_name;
END;
$$;

-- generate_unique_participant_name: Generate unique name in specific group (2 parameters)
CREATE FUNCTION generate_unique_participant_name(p_group_id UUID, p_base_name TEXT)
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

-- rpc_update_weekly_snapshot: Legacy version (4 parameters)
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

-- rpc_update_weekly_snapshot: Current version with week_key (5 parameters)
CREATE FUNCTION rpc_update_weekly_snapshot(
  p_participant_id UUID,
  p_week_key TEXT,
  p_new_value INTEGER,
  p_new_cycle INTEGER,
  p_editor_id UUID
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_snapshot_id UUID;
  v_old_value INTEGER;
  v_old_cycle INTEGER;
BEGIN
  -- Get old values for audit
  SELECT value_int, cycle_number
  INTO v_old_value, v_old_cycle
  FROM public.weekly_snapshots
  WHERE participant_id = p_participant_id
  AND week_key_tuesday = p_week_key;
  
  -- Insert or update snapshot
  INSERT INTO public.weekly_snapshots (
    participant_id,
    week_key_tuesday,
    value_int,
    cycle_number,
    snapshot_at
  )
  VALUES (
    p_participant_id,
    p_week_key,
    p_new_value,
    p_new_cycle,
    NOW()
  )
  ON CONFLICT (participant_id, week_key_tuesday)
  DO UPDATE SET
    value_int = EXCLUDED.value_int,
    cycle_number = EXCLUDED.cycle_number,
    snapshot_at = NOW()
  RETURNING id INTO v_snapshot_id;
  
  -- Create audit entry if values changed
  IF v_old_value IS DISTINCT FROM p_new_value OR v_old_cycle IS DISTINCT FROM p_new_cycle THEN
    INSERT INTO public.audit_weekly_snapshots (
      participant_id,
      week_key_tuesday,
      old_value,
      new_value,
      old_cycle,
      new_cycle,
      edited_by,
      edited_at
    )
    VALUES (
      p_participant_id,
      p_week_key,
      v_old_value,
      p_new_value,
      v_old_cycle,
      p_new_cycle,
      p_editor_id,
      NOW()
    );
  END IF;
  
  RETURN v_snapshot_id;
END;
$$;

-- assign_admin_role: Assign by email (1 parameter)
CREATE FUNCTION assign_admin_role(user_email TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;
END;
$$;

-- assign_admin_role: Assign by user_id (1 parameter)
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
