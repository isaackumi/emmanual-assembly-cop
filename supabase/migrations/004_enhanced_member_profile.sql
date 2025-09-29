-- Enhanced member profile with comprehensive fields
-- Migration: 004_enhanced_member_profile.sql

-- Add new columns to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS place_of_work TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated'));
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS spouse_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- Add new columns to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_baptism DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS holy_ghost_baptism BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_holy_ghost_baptism DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS previous_church TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS reason_for_leaving TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS special_skills TEXT[];
ALTER TABLE members ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_visitor BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS visitor_since DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS visitor_converted_to_member BOOLEAN DEFAULT FALSE;

-- Create groups table for ministry/group management
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL CHECK (group_type IN ('ministry', 'fellowship', 'age_group', 'special_interest', 'leadership')),
  leader_id UUID REFERENCES app_users(id),
  co_leader_id UUID REFERENCES app_users(id),
  meeting_schedule TEXT, -- e.g., "Every Sunday 2:00 PM"
  meeting_location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  max_members INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'co_leader', 'member', 'volunteer')),
  joined_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, member_id)
);

-- Create visitors table for visitor management
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  visit_date DATE DEFAULT CURRENT_DATE,
  service_attended TEXT,
  how_heard_about_church TEXT,
  invited_by_member_id UUID REFERENCES members(id),
  follow_up_notes TEXT,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  converted_to_member BOOLEAN DEFAULT FALSE,
  converted_member_id UUID REFERENCES members(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create dependants table (if not exists)
CREATE TABLE IF NOT EXISTS dependants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT,
  relationship TEXT CHECK (relationship IN ('child', 'spouse', 'parent', 'sibling', 'guardian', 'other')),
  dob DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  phone TEXT,
  email TEXT,
  occupation TEXT,
  is_member BOOLEAN DEFAULT FALSE,
  membership_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_users_first_name ON app_users(first_name);
CREATE INDEX IF NOT EXISTS idx_app_users_last_name ON app_users(last_name);
CREATE INDEX IF NOT EXISTS idx_app_users_occupation ON app_users(occupation);
CREATE INDEX IF NOT EXISTS idx_members_date_of_baptism ON members(date_of_baptism);
CREATE INDEX IF NOT EXISTS idx_members_holy_ghost_baptism ON members(holy_ghost_baptism);
CREATE INDEX IF NOT EXISTS idx_members_is_visitor ON members(is_visitor);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(group_type);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active);
CREATE INDEX IF NOT EXISTS idx_visitors_visit_date ON visitors(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitors_active ON visitors(is_active);
CREATE INDEX IF NOT EXISTS idx_dependants_member_id ON dependants(member_id);
CREATE INDEX IF NOT EXISTS idx_dependants_relationship ON dependants(relationship);

-- Update the profile completion calculation function
-- Drop existing function first
DROP FUNCTION IF EXISTS calculate_profile_completion(UUID);

CREATE OR REPLACE FUNCTION calculate_profile_completion(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  total_fields INTEGER := 20; -- Total number of fields to track
  user_record RECORD;
  member_record RECORD;
BEGIN
  -- Get user record
  SELECT * INTO user_record FROM app_users WHERE id = user_id;
  
  -- Get member record
  SELECT * INTO member_record FROM members WHERE user_id = user_id;
  
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

-- Create trigger to update profile completion
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile completion for the user
  UPDATE app_users 
  SET profile_completion = calculate_profile_completion(NEW.user_id)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for members table
DROP TRIGGER IF EXISTS trigger_update_profile_completion_members ON members;
CREATE TRIGGER trigger_update_profile_completion_members
  AFTER INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion();

-- Create trigger for app_users table
DROP TRIGGER IF EXISTS trigger_update_profile_completion_users ON app_users;
CREATE TRIGGER trigger_update_profile_completion_users
  AFTER UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion();

-- Insert some sample groups
INSERT INTO groups (name, description, group_type, meeting_schedule, meeting_location, max_members) VALUES
('Youth Ministry', 'Ages 18-35', 'age_group', 'Every Sunday 2:00 PM', 'Youth Chapel', 50),
('Women Fellowship', 'Women of all ages', 'fellowship', 'Every Saturday 10:00 AM', 'Fellowship Hall', 100),
('Men Fellowship', 'Men of all ages', 'fellowship', 'Every Saturday 7:00 PM', 'Main Auditorium', 80),
('Children Ministry', 'Ages 5-17', 'age_group', 'Every Sunday 9:00 AM', 'Children Chapel', 30),
('Choir', 'Music and worship team', 'ministry', 'Every Thursday 7:00 PM', 'Choir Room', 25),
('Ushering', 'Welcome and service team', 'ministry', 'Every Sunday 8:00 AM', 'Main Auditorium', 20),
('Evangelism Team', 'Outreach and evangelism', 'ministry', 'Every Saturday 3:00 PM', 'Conference Room', 15),
('Prayer Team', 'Intercessory prayer ministry', 'ministry', 'Every Tuesday 6:00 PM', 'Prayer Room', 30);

-- Add RLS policies for new tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependants ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY groups_select_all ON groups FOR SELECT USING (true);
CREATE POLICY groups_insert_admin ON groups FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM app_users WHERE auth.uid() = app_users.auth_uid AND app_users.role = 'admin')
);
CREATE POLICY groups_update_admin ON groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM app_users WHERE auth.uid() = app_users.auth_uid AND app_users.role = 'admin')
);

-- Group members policies
CREATE POLICY group_members_select_all ON group_members FOR SELECT USING (true);
CREATE POLICY group_members_insert_admin ON group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM app_users WHERE auth.uid() = app_users.auth_uid AND app_users.role IN ('admin', 'pastor', 'elder'))
);

-- Visitors policies
CREATE POLICY visitors_select_all ON visitors FOR SELECT USING (true);
CREATE POLICY visitors_insert_admin ON visitors FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM app_users WHERE auth.uid() = app_users.auth_uid AND app_users.role IN ('admin', 'pastor', 'elder'))
);
CREATE POLICY visitors_update_admin ON visitors FOR UPDATE USING (
  EXISTS (SELECT 1 FROM app_users WHERE auth.uid() = app_users.auth_uid AND app_users.role IN ('admin', 'pastor', 'elder'))
);

-- Dependants policies
CREATE POLICY dependants_select_all ON dependants FOR SELECT USING (true);
CREATE POLICY dependants_insert_admin ON dependants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM app_users WHERE auth.uid() = app_users.auth_uid AND app_users.role IN ('admin', 'pastor', 'elder'))
);
CREATE POLICY dependants_update_admin ON dependants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM app_users WHERE auth.uid() = app_users.auth_uid AND app_users.role IN ('admin', 'pastor', 'elder'))
);
