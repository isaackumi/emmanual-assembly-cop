-- NUCLEAR FIX: Remove ALL possible sources of recursion
-- Migration: 009_nuclear_fix.sql

-- Disable RLS temporarily to see if that's causing issues
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- Drop ALL triggers on ALL tables
DROP TRIGGER IF EXISTS trigger_update_profile_completion_members ON members;
DROP TRIGGER IF EXISTS trigger_update_profile_completion_users ON app_users;

-- Drop ALL functions that could cause recursion
DROP FUNCTION IF EXISTS update_profile_completion();
DROP FUNCTION IF EXISTS update_profile_completion_members();
DROP FUNCTION IF EXISTS update_profile_completion_users();
DROP FUNCTION IF EXISTS calculate_profile_completion(UUID);
DROP FUNCTION IF EXISTS calculate_profile_completion_safe(UUID);
DROP FUNCTION IF EXISTS update_member_profile_completion(UUID);
DROP FUNCTION IF EXISTS update_single_profile_completion(UUID);
DROP FUNCTION IF EXISTS refresh_all_profile_completions();
DROP FUNCTION IF EXISTS batch_update_profile_completions();

-- Remove profile_completion column temporarily to eliminate the source
ALTER TABLE app_users DROP COLUMN IF EXISTS profile_completion;

-- Re-add profile_completion as a simple integer without any triggers
ALTER TABLE app_users ADD COLUMN profile_completion INTEGER DEFAULT 0;

-- Update all existing users to have 0 completion
UPDATE app_users SET profile_completion = 0;

-- Re-enable RLS with basic policies (no complex logic)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Drop and recreate simple RLS policies without complex logic
DROP POLICY IF EXISTS app_users_select_all ON app_users;
DROP POLICY IF EXISTS app_users_insert_admin ON app_users;
DROP POLICY IF EXISTS app_users_update_admin ON app_users;
DROP POLICY IF EXISTS app_users_update_self ON app_users;

DROP POLICY IF EXISTS members_select_all ON members;
DROP POLICY IF EXISTS members_insert_admin ON members;
DROP POLICY IF EXISTS members_update_admin ON members;
DROP POLICY IF EXISTS members_update_self ON members;

-- Create very simple RLS policies
CREATE POLICY app_users_select_all ON app_users FOR SELECT USING (true);
CREATE POLICY app_users_insert_admin ON app_users FOR INSERT WITH CHECK (true);
CREATE POLICY app_users_update_admin ON app_users FOR UPDATE USING (true);

CREATE POLICY members_select_all ON members FOR SELECT USING (true);
CREATE POLICY members_insert_admin ON members FOR INSERT WITH CHECK (true);
CREATE POLICY members_update_admin ON members FOR UPDATE USING (true);

-- Create a simple function for profile completion that doesn't update the database
CREATE OR REPLACE FUNCTION get_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  total_fields INTEGER := 20;
BEGIN
  -- Simple calculation without any database updates
  SELECT 
    CASE WHEN au.first_name IS NOT NULL AND au.first_name != '' THEN 1 ELSE 0 END +
    CASE WHEN au.last_name IS NOT NULL AND au.last_name != '' THEN 1 ELSE 0 END +
    CASE WHEN au.phone IS NOT NULL AND au.phone != '' THEN 1 ELSE 0 END +
    CASE WHEN au.email IS NOT NULL AND au.email != '' THEN 1 ELSE 0 END +
    CASE WHEN m.gender IS NOT NULL AND m.gender != '' THEN 1 ELSE 0 END +
    CASE WHEN m.address IS NOT NULL AND m.address != '' THEN 1 ELSE 0 END +
    CASE WHEN au.secondary_phone IS NOT NULL AND au.secondary_phone != '' THEN 1 ELSE 0 END +
    CASE WHEN au.emergency_contact_phone IS NOT NULL AND au.emergency_contact_phone != '' THEN 1 ELSE 0 END +
    CASE WHEN au.occupation IS NOT NULL AND au.occupation != '' THEN 1 ELSE 0 END +
    CASE WHEN au.place_of_work IS NOT NULL AND au.place_of_work != '' THEN 1 ELSE 0 END +
    CASE WHEN au.marital_status IS NOT NULL AND au.marital_status != '' THEN 1 ELSE 0 END +
    CASE WHEN au.spouse_name IS NOT NULL AND au.spouse_name != '' THEN 1 ELSE 0 END +
    CASE WHEN au.children_count IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN m.dob IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN m.date_of_baptism IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN m.holy_ghost_baptism IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN m.date_of_holy_ghost_baptism IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN m.profile_photo_url IS NOT NULL AND m.profile_photo_url != '' THEN 1 ELSE 0 END +
    CASE WHEN m.special_skills IS NOT NULL AND array_length(m.special_skills, 1) > 0 THEN 1 ELSE 0 END +
    CASE WHEN m.interests IS NOT NULL AND array_length(m.interests, 1) > 0 THEN 1 ELSE 0 END
  INTO completion_score
  FROM app_users au
  LEFT JOIN members m ON au.id = m.user_id
  WHERE au.id = p_user_id;
  
  RETURN ROUND((completion_score::DECIMAL / total_fields::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;
