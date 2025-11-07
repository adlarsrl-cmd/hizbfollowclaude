/*
  # Add unique constraint and participant name generation
  
  1. Changes
    - Add unique constraint on display_name in user_profiles table
    - Update handle_new_user function to generate automatic participant name
    - Add function to generate unique participant names
  
  2. Notes
    - Participant names are globally unique
    - Format: Follower-[Adjective]
    - If collision, adds random suffix
*/

-- Function to generate a unique participant name
CREATE OR REPLACE FUNCTION public.generate_unique_participant_name()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  adjectives text[] := ARRAY[
    'Rapide', 'Brillant', 'Sage', 'Fort', 'Doux', 'Brave', 'Loyal', 'Noble', 'Calme', 'Vif',
    'Agile', 'Habile', 'Juste', 'Fier', 'Généreux', 'Patient', 'Sincère', 'Humble', 'Audacieux', 'Énergique',
    'Joyeux', 'Serein', 'Dynamique', 'Radieux', 'Diligent', 'Élégant', 'Fidèle', 'Gracieux', 'Harmonieux', 'Inspiré',
    'Lumineux', 'Majestueux', 'Optimiste', 'Paisible', 'Rayonnant', 'Solide', 'Tenace', 'Vigilant', 'Zélé', 'Attentif',
    'Swift', 'Bright', 'Wise', 'Strong', 'Gentle', 'Bold', 'Keen', 'Quick', 'Clever', 'Fair',
    'Proud', 'Kind', 'Honest', 'Lively', 'Happy', 'Serene', 'Active', 'Radiant', 'Diligent', 'Elegant',
    'Faithful', 'Graceful', 'Harmonic', 'Inspired', 'Grand', 'Cheerful', 'Peaceful', 'Shining', 'Solid', 'Steadfast',
    'Alert', 'Eager', 'Mindful'
  ];
  base_name text;
  final_name text;
  attempt int := 0;
  max_attempts int := 100;
BEGIN
  LOOP
    -- Pick random adjective
    base_name := 'Follower-' || adjectives[1 + floor(random() * array_length(adjectives, 1))::int];
    
    -- Add random suffix if not first attempt
    IF attempt > 0 THEN
      final_name := base_name || '-' || floor(random() * 10000)::text;
    ELSE
      final_name := base_name;
    END IF;
    
    -- Check if name exists
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE display_name = final_name) THEN
      RETURN final_name;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      -- Fallback with timestamp
      RETURN base_name || '-' || extract(epoch from now())::bigint::text;
    END IF;
  END LOOP;
END;
$$;

-- Add unique constraint on display_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_display_name_key'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_display_name_key 
    UNIQUE (display_name);
  END IF;
END $$;

-- Update handle_new_user function to generate participant name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    new.id, 
    new.email,
    public.generate_unique_participant_name()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- Update existing users without display_name
UPDATE public.user_profiles
SET display_name = public.generate_unique_participant_name()
WHERE display_name IS NULL OR display_name = '';
