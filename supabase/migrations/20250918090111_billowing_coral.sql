/*
  # Create admin user

  1. New User
    - Creates user `adiladmin@hizbfollow.com` with password `adiladil88/`
    - Assigns admin role in user_roles table
  
  2. Security
    - User will have admin privileges
    - Can manage other users and edit history
*/

-- Insert the admin user into auth.users
-- Note: In production, you should create this user through the Supabase dashboard
-- This is a fallback method that may not work in all Supabase configurations

-- Create the user role entry (assuming the user will be created via dashboard)
-- We'll use a placeholder UUID that should be replaced with the actual user ID
-- after creating the user in the Supabase dashboard

-- For now, we'll create a function that can be called after the user is created
CREATE OR REPLACE FUNCTION assign_admin_role(user_email text)
RETURNS void AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_uuid IS NOT NULL THEN
    -- Insert or update the user role
    INSERT INTO user_roles (user_id, role)
    VALUES (user_uuid, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call the function to assign admin role to the user
-- This will work once the user is created in Supabase dashboard
SELECT assign_admin_role('adiladmin@hizbfollow.com');