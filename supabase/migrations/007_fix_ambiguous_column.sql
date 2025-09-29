-- Fix ambiguous column reference in calculate_profile_completion function
-- Migration: 007_fix_ambiguous_column.sql

-- Drop and recreate the function with proper variable naming
DROP FUNCTION IF EXISTS calculate_profile_completion(UUID);

CREATE OR REPLACE FUNCTION calculate_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  total_fields INTEGER := 20; -- Total number of fields to track
  user_record RECORD;
  member_record RECORD;
BEGIN
  -- Get user record
  SELECT * INTO user_record FROM app_users WHERE id = p_user_id;
  
  -- Get member record
  SELECT * INTO member_record FROM members WHERE user_id = p_user_id;
  
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

-- Update the other functions to use the correct parameter name
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

-- Now run the refresh function
SELECT refresh_all_profile_completions();
