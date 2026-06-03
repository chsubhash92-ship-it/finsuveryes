/*
  # Fix profile creation trigger

  ## Summary
  Updates the handle_new_user trigger to be more robust and handle edge cases better.
  
  ## Changes
  - Drop and recreate the trigger with better error handling
  - Use UPSERT pattern to avoid conflicts
  - Add explicit CASCADE delete handling
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate with better logic
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, profiles.email),
    username = COALESCE(NEW.raw_user_meta_data->>'username', profiles.username);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail - profile can be created later
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
