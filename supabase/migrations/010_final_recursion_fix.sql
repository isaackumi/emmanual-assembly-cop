-- Final fix for infinite recursion - Handle view dependencies
-- Migration: 010_final_recursion_fix.sql

-- Drop the view first
DROP VIEW IF EXISTS member_profile_summary;

-- Now drop the column
ALTER TABLE app_users DROP COLUMN IF EXISTS profile_completion;

-- Re-add the column
ALTER TABLE app_users ADD COLUMN profile_completion INTEGER DEFAULT 0;

-- Update all users to 0
UPDATE app_users SET profile_completion = 0;

-- Recreate the view
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
