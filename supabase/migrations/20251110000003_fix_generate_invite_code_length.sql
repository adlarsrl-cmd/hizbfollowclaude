/*
  # Fix generate_invite_code to return 15 characters instead of 6
  
  The function was generating 6-character codes, but the database constraint
  requires 15 characters. This caused rotate_expired_invite_codes() to hang
  because it could never generate valid codes.
*/

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  result text := '';
  i int;
  char_count int := length(chars);
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    -- Generate 15 random characters (matching the constraint requirement)
    FOR i IN 1..15 LOOP
      result := result || substr(chars, floor(random() * char_count + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM public.groups 
      WHERE invite_code = result
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.generate_invite_code() IS 
'Generates a unique 15-character invite code for groups. Uses characters: a-z, A-Z, 0-9, _, -';

