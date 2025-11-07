/*
  # Phase 2B: Group Weekly Snapshots Table
  
  1. New Table
    - `group_weekly_snapshots` - Weekly aggregated snapshots per group
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to groups)
      - `snapshot_date` (date) - Reference day of the week
      - `week_number` (integer) - ISO week number
      - `year` (integer) - Year
      - `total_participants` (integer) - Number of active participants
      - `participants_with_entries` (integer) - Participants who submitted this week
      - `total_hizb_week` (integer) - Total hizb read this week
      - `total_pages_week` (integer) - Total pages read this week
      - `average_completion_rate` (numeric) - Average % of target achieved
      - `data` (jsonb) - Additional aggregated data
      - `created_by` (uuid) - User who created the snapshot
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Members can view snapshots of their groups
    - Owner/Manager can create snapshots
  
  3. Indexes
    - group_id for fast lookups
    - year + week_number for time-based queries
*/

-- =============== CREATE GROUP_WEEKLY_SNAPSHOTS TABLE ===============

CREATE TABLE IF NOT EXISTS public.group_weekly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  
  -- Snapshot metadata
  snapshot_date date NOT NULL,
  week_number integer NOT NULL,
  year integer NOT NULL,
  
  -- Aggregated metrics
  total_participants integer NOT NULL DEFAULT 0,
  participants_with_entries integer NOT NULL DEFAULT 0,
  total_hizb_week integer NOT NULL DEFAULT 0,
  total_pages_week integer NOT NULL DEFAULT 0,
  average_completion_rate numeric(5,2) DEFAULT 0.00,
  
  -- Additional data
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  -- Unique constraint: one snapshot per group per week
  UNIQUE(group_id, year, week_number)
);

-- =============== CREATE INDEXES ===============

CREATE INDEX IF NOT EXISTS idx_group_weekly_snapshots_group_id 
  ON public.group_weekly_snapshots(group_id);
  
CREATE INDEX IF NOT EXISTS idx_group_weekly_snapshots_date 
  ON public.group_weekly_snapshots(snapshot_date DESC);
  
CREATE INDEX IF NOT EXISTS idx_group_weekly_snapshots_year_week 
  ON public.group_weekly_snapshots(year DESC, week_number DESC);

-- =============== ENABLE RLS ===============

ALTER TABLE public.group_weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- =============== RLS POLICIES ===============

-- Members can view snapshots of their groups
CREATE POLICY group_weekly_snapshots_select ON public.group_weekly_snapshots
  FOR SELECT
  TO authenticated
  USING (
    public.user_is_in_group(group_id)
  );

-- Owner and managers can create snapshots
CREATE POLICY group_weekly_snapshots_insert ON public.group_weekly_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role_in_group(group_id, auth.uid()) IN ('owner', 'manager')
  );

-- Only creator or owner can delete snapshots
CREATE POLICY group_weekly_snapshots_delete ON public.group_weekly_snapshots
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_user_role_in_group(group_id, auth.uid()) = 'owner'
  );

-- =============== COMMENTS ===============

COMMENT ON TABLE public.group_weekly_snapshots IS 
  'Weekly aggregated snapshots for entire groups. Tracks group-level progress and participation metrics.';

COMMENT ON COLUMN public.group_weekly_snapshots.total_participants IS 
  'Number of active participants in the group at snapshot time';

COMMENT ON COLUMN public.group_weekly_snapshots.participants_with_entries IS 
  'Number of participants who submitted at least one entry during the week';

COMMENT ON COLUMN public.group_weekly_snapshots.average_completion_rate IS 
  'Average percentage of weekly target achieved across all participants';

COMMENT ON COLUMN public.group_weekly_snapshots.data IS 
  'Additional aggregated data: top performers, completion distribution, etc.';