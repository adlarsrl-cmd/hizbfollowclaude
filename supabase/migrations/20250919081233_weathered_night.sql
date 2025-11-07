/*
  # Add restart tracking columns to entries table

  1. New Columns
    - `is_restart` (boolean, default false) - Marks entries as restarts
    - `previous_position` (integer, nullable) - Stores the previous position before restart

  2. Purpose
    - Track when participants restart their reading from a different position
    - Maintain history of "lost" positions for accurate progress calculations
    - Enable proper delta calculations for weekly progress analytics
*/

-- Add restart tracking columns to entries table
ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS is_restart BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS previous_position INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.entries.is_restart IS 'Indicates if this entry represents a restart (position reset)';
COMMENT ON COLUMN public.entries.previous_position IS 'Previous position before restart (for tracking lost progress)';