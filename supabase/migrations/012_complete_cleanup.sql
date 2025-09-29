-- Complete cleanup - Remove EVERYTHING that could cause recursion
-- Migration: 012_complete_cleanup.sql

-- Step 1: Disable RLS completely on all tables
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE dependants DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL triggers (be very thorough)
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
                      trigger_record.trigger_name, 
                      trigger_record.event_object_table);
    END LOOP;
END $$;

-- Step 3: Drop ALL functions that could cause issues
DROP FUNCTION IF EXISTS update_profile_completion() CASCADE;
DROP FUNCTION IF EXISTS update_profile_completion_members() CASCADE;
DROP FUNCTION IF EXISTS update_profile_completion_users() CASCADE;
DROP FUNCTION IF EXISTS calculate_profile_completion(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_profile_completion_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_member_profile_completion(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_single_profile_completion(UUID) CASCADE;
DROP FUNCTION IF EXISTS refresh_all_profile_completions() CASCADE;
DROP FUNCTION IF EXISTS batch_update_profile_completions() CASCADE;
DROP FUNCTION IF EXISTS get_profile_completion(UUID) CASCADE;

-- Step 4: Drop ALL policies
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                      policy_record.policyname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Step 5: Drop views that might cause issues
DROP VIEW IF EXISTS member_profile_summary CASCADE;

-- Step 6: Remove profile_completion column completely
ALTER TABLE app_users DROP COLUMN IF EXISTS profile_completion CASCADE;

-- Step 7: Re-add profile_completion as a simple column with no triggers
ALTER TABLE app_users ADD COLUMN profile_completion INTEGER DEFAULT 0;

-- Step 8: Set all profile completions to 0
UPDATE app_users SET profile_completion = 0;

-- Step 9: Re-enable RLS with the most basic policies possible
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependants ENABLE ROW LEVEL SECURITY;

-- Step 10: Create the most basic RLS policies (no complex logic)
CREATE POLICY "Allow all operations on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on group_members" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on visitors" ON visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on dependants" ON dependants FOR ALL USING (true) WITH CHECK (true);

-- Step 11: Create a simple view without any complex logic
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

-- Step 12: Verify no triggers exist
SELECT 'No triggers should exist' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
);
