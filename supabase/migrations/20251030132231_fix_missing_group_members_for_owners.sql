/*
  # Fix Missing Group Members for Owners

  1. Purpose
    - Ensure ALL group owners have a corresponding group_members record
    - This fixes the issue where existing groups became invisible after RLS policies
  
  2. What it does
    - Scans all groups
    - Creates owner membership for any group where it's missing
    - Idempotent: safe to run multiple times
  
  3. Notes
    - Uses ON CONFLICT to avoid duplicates
    - Preserves existing memberships
*/

-- =============== BACKFILL GROUP_MEMBERS FOR ALL EXISTING GROUPS ===============

INSERT INTO public.group_members (group_id, user_id, role, can_write_self)
SELECT 
  g.id as group_id,
  g.owner_id as user_id,
  'owner' as role,
  true as can_write_self
FROM public.groups g
WHERE g.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = g.id 
      AND gm.user_id = g.owner_id
  )
ON CONFLICT (group_id, user_id) DO NOTHING;

-- =============== VERIFY RESULTS ===============

-- Log how many memberships were created
DO $$
DECLARE
  v_groups_count int;
  v_members_count int;
BEGIN
  SELECT COUNT(*) INTO v_groups_count FROM public.groups WHERE owner_id IS NOT NULL;
  SELECT COUNT(DISTINCT group_id) INTO v_members_count FROM public.group_members WHERE role = 'owner';
  
  RAISE NOTICE 'Groups with owner: %, Owner memberships: %', v_groups_count, v_members_count;
END $$;