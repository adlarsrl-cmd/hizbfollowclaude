-- Add 'app_reader' and 'starting_point' as valid sources for entries
-- This allows entries to be created from the Quran reader page and starting points

-- Drop the existing constraint
ALTER TABLE public.entries 
DROP CONSTRAINT IF EXISTS entries_source_check;

-- Add the new constraint with 'app_reader' and 'starting_point' included
ALTER TABLE public.entries 
ADD CONSTRAINT entries_source_check 
CHECK (source IN ('manual', 'import', 'seed', 'app_reader', 'starting_point'));

