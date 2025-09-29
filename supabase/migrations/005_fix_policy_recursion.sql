-- Fix infinite recursion in app_users policy
-- Migration: 005_fix_policy_recursion.sql

-- Drop the problematic triggers first
DROP TRIGGER IF EXISTS trigger_update_profile_completion_members ON members;
DROP TRIGGER IF EXISTS trigger_update_profile_completion_users ON app_users;

-- Drop the function
DROP FUNCTION IF EXISTS update_profile_completion();

-- Create a safer version that prevents recursion
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the profile_completion actually changed to prevent recursion
  DECLARE
    new_completion INTEGER;
  BEGIN
    -- Calculate new completion percentage
    SELECT calculate_profile_completion(NEW.user_id) INTO new_completion;
    
    -- Only update if the value is different to prevent infinite loops
    IF new_completion != COALESCE(NEW.profile_completion, 0) THEN
      UPDATE app_users 
      SET profile_completion = new_completion,
          updated_at = now()
      WHERE id = NEW.user_id;
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a safer trigger that only fires on specific column changes
CREATE OR REPLACE FUNCTION update_profile_completion_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if relevant columns changed
  IF (OLD IS NULL OR 
      OLD.dob IS DISTINCT FROM NEW.dob OR
      OLD.gender IS DISTINCT FROM NEW.gender OR
      OLD.address IS DISTINCT FROM NEW.address OR
      OLD.date_of_baptism IS DISTINCT FROM NEW.date_of_baptism OR
      OLD.holy_ghost_baptism IS DISTINCT FROM NEW.holy_ghost_baptism OR
      OLD.date_of_holy_ghost_baptism IS DISTINCT FROM NEW.date_of_holy_ghost_baptism OR
      OLD.special_skills IS DISTINCT FROM NEW.special_skills OR
      OLD.interests IS DISTINCT FROM NEW.interests OR
      OLD.profile_photo_url IS DISTINCT FROM NEW.profile_photo_url) THEN
    
    -- Calculate new completion percentage
    DECLARE
      new_completion INTEGER;
      current_completion INTEGER;
    BEGIN
      SELECT calculate_profile_completion(NEW.user_id) INTO new_completion;
      SELECT profile_completion INTO current_completion FROM app_users WHERE id = NEW.user_id;
      
      -- Only update if the value is different to prevent infinite loops
      IF new_completion != COALESCE(current_completion, 0) THEN
        UPDATE app_users 
        SET profile_completion = new_completion,
            updated_at = now()
        WHERE id = NEW.user_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_profile_completion_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if relevant columns changed and avoid updating profile_completion column
  IF (OLD.first_name IS DISTINCT FROM NEW.first_name OR
      OLD.middle_name IS DISTINCT FROM NEW.middle_name OR
      OLD.last_name IS DISTINCT FROM NEW.last_name OR
      OLD.phone IS DISTINCT FROM NEW.phone OR
      OLD.secondary_phone IS DISTINCT FROM NEW.secondary_phone OR
      OLD.email IS DISTINCT FROM NEW.email OR
      OLD.occupation IS DISTINCT FROM NEW.occupation OR
      OLD.place_of_work IS DISTINCT FROM NEW.place_of_work OR
      OLD.marital_status IS DISTINCT FROM NEW.marital_status OR
      OLD.spouse_name IS DISTINCT FROM NEW.spouse_name OR
      OLD.children_count IS DISTINCT FROM NEW.children_count OR
      OLD.emergency_contact_name IS DISTINCT FROM NEW.emergency_contact_name OR
      OLD.emergency_contact_phone IS DISTINCT FROM NEW.emergency_contact_phone OR
      OLD.emergency_contact_relation IS DISTINCT FROM NEW.emergency_contact_relation) THEN
    
    -- Calculate new completion percentage
    DECLARE
      new_completion INTEGER;
      current_completion INTEGER;
    BEGIN
      SELECT calculate_profile_completion(NEW.id) INTO new_completion;
      
      -- Only update if the value is different to prevent infinite loops
      IF new_completion != COALESCE(NEW.profile_completion, 0) THEN
        -- Use a different approach to avoid recursion
        PERFORM 1 FROM app_users WHERE id = NEW.id AND profile_completion != new_completion;
        IF FOUND THEN
          UPDATE app_users 
          SET profile_completion = new_completion,
              updated_at = now()
          WHERE id = NEW.id AND profile_completion != new_completion;
        END IF;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new triggers
CREATE TRIGGER trigger_update_profile_completion_members
  AFTER INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_members();

CREATE TRIGGER trigger_update_profile_completion_users
  AFTER UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_users();

-- Alternative approach: Create a function that can be called manually or via a scheduled job
CREATE OR REPLACE FUNCTION refresh_all_profile_completions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  user_record RECORD;
  new_completion INTEGER;
BEGIN
  FOR user_record IN SELECT id, profile_completion FROM app_users LOOP
    SELECT calculate_profile_completion(user_record.id) INTO new_completion;
    
    IF new_completion != COALESCE(user_record.profile_completion, 0) THEN
      UPDATE app_users 
      SET profile_completion = new_completion,
          updated_at = now()
      WHERE id = user_record.id;
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
