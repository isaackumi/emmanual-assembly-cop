-- Disable automatic profile completion to prevent recursion
-- Migration: 006_disable_auto_profile_completion.sql

-- Drop all triggers to prevent recursion
DROP TRIGGER IF EXISTS trigger_update_profile_completion_members ON members;
DROP TRIGGER IF EXISTS trigger_update_profile_completion_users ON app_users;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS update_profile_completion();
DROP FUNCTION IF EXISTS update_profile_completion_members();
DROP FUNCTION IF EXISTS update_profile_completion_users();

-- Create a simple function that can be called manually
CREATE OR REPLACE FUNCTION update_member_profile_completion(member_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_completion INTEGER;
BEGIN
  SELECT calculate_profile_completion(member_user_id) INTO new_completion;
  
  UPDATE app_users 
  SET profile_completion = new_completion,
      updated_at = now()
  WHERE id = member_user_id;
  
  RETURN new_completion;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update all profile completions
CREATE OR REPLACE FUNCTION refresh_all_profile_completions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  user_record RECORD;
  new_completion INTEGER;
BEGIN
  FOR user_record IN SELECT id FROM app_users LOOP
    SELECT calculate_profile_completion(user_record.id) INTO new_completion;
    
    UPDATE app_users 
    SET profile_completion = new_completion,
        updated_at = now()
    WHERE id = user_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Update existing users with their current profile completion
SELECT refresh_all_profile_completions();
