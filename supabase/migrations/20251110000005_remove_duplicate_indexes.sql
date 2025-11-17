/*
  # Remove Duplicate Indexes
  
  This migration removes duplicate indexes that waste storage space.
  Only removes duplicates, keeps the original indexes.
  
  ⚠️ SAFE: Only drops duplicate indexes, keeps originals
  ⚠️ REVERSIBLE: Can recreate if needed (but shouldn't be necessary)
  
  Impact: Low risk - only removes duplicates, original indexes remain
  Performance: Reduces storage overhead, slightly faster writes
*/

-- Remove duplicate indexes from entries table
-- Keep: idx_entries_group, Drop: idx_entries_group_id
DROP INDEX IF EXISTS public.idx_entries_group_id;

-- Remove duplicate indexes from group_members table
-- Keep: idx_group_members_group, Drop: idx_group_members_group_id
DROP INDEX IF EXISTS public.idx_group_members_group_id;

-- Keep: idx_group_members_user, Drop: idx_group_members_user_id
DROP INDEX IF EXISTS public.idx_group_members_user_id;

-- Remove duplicate indexes from participants table
-- Keep: idx_participants_group, Drop: idx_participants_group_id
DROP INDEX IF EXISTS public.idx_participants_group_id;

-- Verify original indexes still exist (these should not fail)
DO $$
BEGIN
  -- Check that original indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_entries_group'
  ) THEN
    RAISE EXCEPTION 'Original index idx_entries_group does not exist!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_group_members_group'
  ) THEN
    RAISE EXCEPTION 'Original index idx_group_members_group does not exist!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_group_members_user'
  ) THEN
    RAISE EXCEPTION 'Original index idx_group_members_user does not exist!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_participants_group'
  ) THEN
    RAISE EXCEPTION 'Original index idx_participants_group does not exist!';
  END IF;
END $$;

