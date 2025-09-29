-- Final cleanup: Remove ALL triggers and implement frontend-based profile completion
-- Migration: 013_remove_all_triggers_final.sql

-- Step 1: Disable RLS temporarily
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL triggers that could cause recursion
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

-- Step 5: Drop views
DROP VIEW IF EXISTS member_profile_summary CASCADE;

-- Step 6: Remove profile_completion column completely (we'll calculate in frontend)
ALTER TABLE app_users DROP COLUMN IF EXISTS profile_completion CASCADE;

-- Step 7: Re-enable RLS with simple policies
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Step 8: Create simple RLS policies
CREATE POLICY "app_users_all_access" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "members_all_access" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "groups_all_access" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_members_all_access" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "visitors_all_access" ON visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dependants_all_access" ON dependants FOR ALL USING (true) WITH CHECK (true);

-- Step 9: Create a simple view for member profiles
CREATE OR REPLACE VIEW member_profile_summary AS
SELECT 
  au.id,
  au.full_name,
  au.membership_id,
  au.role,
  au.created_at,
  m.status,
  m.dob,
  m.gender,
  m.date_of_baptism,
  m.holy_ghost_baptism,
  m.date_of_holy_ghost_baptism
FROM app_users au
LEFT JOIN members m ON au.id = m.user_id;
