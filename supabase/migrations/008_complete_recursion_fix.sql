-- Complete fix for infinite recursion - Remove ALL problematic triggers and functions
-- Migration: 008_complete_recursion_fix.sql

-- Drop ALL triggers that could cause recursion
DROP TRIGGER IF EXISTS trigger_update_profile_completion_members ON members;
DROP TRIGGER IF EXISTS trigger_update_profile_completion_users ON app_users;

-- Drop ALL functions that could cause recursion
DROP FUNCTION IF EXISTS update_profile_completion();
DROP FUNCTION IF EXISTS update_profile_completion_members();
DROP FUNCTION IF EXISTS update_profile_completion_users();
DROP FUNCTION IF EXISTS calculate_profile_completion(UUID);
DROP FUNCTION IF EXISTS update_member_profile_completion(UUID);
DROP FUNCTION IF EXISTS refresh_all_profile_completions();

-- Create a simple, safe profile completion calculation function
CREATE OR REPLACE FUNCTION calculate_profile_completion_safe(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  total_fields INTEGER := 20;
  user_record RECORD;
  member_record RECORD;
BEGIN
  -- Get user record with explicit column selection to avoid conflicts
  SELECT 
    first_name, middle_name, last_name, phone, secondary_phone, email,
    occupation, place_of_work, marital_status, spouse_name, children_count,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation
  INTO user_record 
  FROM app_users 
  WHERE id = p_user_id;
  
  -- Get member record with explicit column selection
  SELECT 
    dob, gender, address, date_of_baptism, holy_ghost_baptism, 
    date_of_holy_ghost_baptism, special_skills, interests, profile_photo_url
  INTO member_record 
  FROM members 
  WHERE user_id = p_user_id;
  
  -- Only proceed if we have records
  IF user_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Personal Information (5 fields)
  IF user_record.first_name IS NOT NULL AND user_record.first_name != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.last_name IS NOT NULL AND user_record.last_name != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.phone IS NOT NULL AND user_record.phone != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.email IS NOT NULL AND user_record.email != '' THEN completion_score := completion_score + 1; END IF;
  IF member_record.gender IS NOT NULL AND member_record.gender != '' THEN completion_score := completion_score + 1; END IF;
  
  -- Contact & Location (3 fields)
  IF member_record.address IS NOT NULL AND member_record.address != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.secondary_phone IS NOT NULL AND user_record.secondary_phone != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.emergency_contact_phone IS NOT NULL AND user_record.emergency_contact_phone != '' THEN completion_score := completion_score + 1; END IF;
  
  -- Professional Information (2 fields)
  IF user_record.occupation IS NOT NULL AND user_record.occupation != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.place_of_work IS NOT NULL AND user_record.place_of_work != '' THEN completion_score := completion_score + 1; END IF;
  
  -- Family Information (3 fields)
  IF user_record.marital_status IS NOT NULL AND user_record.marital_status != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.spouse_name IS NOT NULL AND user_record.spouse_name != '' THEN completion_score := completion_score + 1; END IF;
  IF user_record.children_count IS NOT NULL THEN completion_score := completion_score + 1; END IF;
  
  -- Spiritual Information (4 fields)
  IF member_record.dob IS NOT NULL THEN completion_score := completion_score + 1; END IF;
  IF member_record.date_of_baptism IS NOT NULL THEN completion_score := completion_score + 1; END IF;
  IF member_record.holy_ghost_baptism IS NOT NULL THEN completion_score := completion_score + 1; END IF;
  IF member_record.date_of_holy_ghost_baptism IS NOT NULL THEN completion_score := completion_score + 1; END IF;
  
  -- Additional Information (3 fields)
  IF member_record.profile_photo_url IS NOT NULL AND member_record.profile_photo_url != '' THEN completion_score := completion_score + 1; END IF;
  IF member_record.special_skills IS NOT NULL AND array_length(member_record.special_skills, 1) > 0 THEN completion_score := completion_score + 1; END IF;
  IF member_record.interests IS NOT NULL AND array_length(member_record.interests, 1) > 0 THEN completion_score := completion_score + 1; END IF;
  
  -- Calculate percentage
  RETURN ROUND((completion_score::DECIMAL / total_fields::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;

-- Create a safe function to update a single user's profile completion
CREATE OR REPLACE FUNCTION update_single_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_completion INTEGER;
BEGIN
  -- Calculate completion
  SELECT calculate_profile_completion_safe(p_user_id) INTO new_completion;
  
  -- Update only if different to prevent unnecessary updates
  UPDATE app_users 
  SET profile_completion = new_completion,
      updated_at = now()
  WHERE id = p_user_id 
    AND (profile_completion IS NULL OR profile_completion != new_completion);
  
  RETURN new_completion;
END;
$$ LANGUAGE plpgsql;

-- Create a batch function to update all profile completions safely
CREATE OR REPLACE FUNCTION batch_update_profile_completions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  user_id UUID;
  new_completion INTEGER;
BEGIN
  -- Loop through all users and update their completion
  FOR user_id IN SELECT id FROM app_users LOOP
    SELECT calculate_profile_completion_safe(user_id) INTO new_completion;
    
    UPDATE app_users 
    SET profile_completion = new_completion,
        updated_at = now()
    WHERE id = user_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Set all existing users to 0 completion for now (we'll update them manually)
UPDATE app_users SET profile_completion = 0 WHERE profile_completion IS NULL;

-- Update a few users manually to test (optional)
-- SELECT update_single_profile_completion('your-user-id-here');

-- Create a simple view for profile completion that doesn't trigger updates
CREATE OR REPLACE VIEW member_profile_summary AS
SELECT 
  au.id,
  au.full_name,
  au.membership_id,
  au.role,
  au.profile_completion,
  au.created_at,
  m.status,
  m.dob,
  m.gender
FROM app_users au
LEFT JOIN members m ON au.id = m.user_id;
