# Database Migration Instructions

## Migration 004: Enhanced Member Profile

To apply the enhanced member profile migration, please run the following SQL in your Supabase SQL Editor:

### Step 1: Copy and run the SQL from `supabase/migrations/004_enhanced_member_profile.sql`

This migration adds:

1. **Enhanced app_users table** with:

   - first_name, middle_name, last_name
   - secondary_phone
   - occupation, place_of_work
   - marital_status, spouse_name, children_count
   - emergency_contact_name, emergency_contact_phone, emergency_contact_relation

2. **Enhanced members table** with:

   - date_of_baptism, holy_ghost_baptism, date_of_holy_ghost_baptism
   - previous_church, reason_for_leaving
   - special_skills (array), interests (array)
   - profile_photo_url
   - is_visitor, visitor_since, visitor_converted_to_member

3. **New tables**:

   - `groups` - for ministry/group management
   - `group_members` - many-to-many relationship between groups and members
   - `visitors` - separate visitor management
   - `dependants` - enhanced dependant information

4. **Profile completion calculation** - automatically calculates completion percentage based on filled fields

5. **Sample data** - pre-populates common groups like Youth Ministry, Women Fellowship, etc.

### Step 2: Verify the migration

After running the migration, verify that:

- All new columns exist in `app_users` and `members` tables
- New tables `groups`, `group_members`, `visitors`, `dependants` are created
- Sample groups are inserted
- Profile completion function is working

### Step 3: Test the new features

1. Go to `/members/add` to test the new multi-step member onboarding
2. Go to `/visitors` to test visitor management
3. Go to `/groups` to test group management
4. Check individual member profiles for profile completion tracking

### Important Notes

- The migration includes `DROP FUNCTION IF EXISTS` to handle existing functions
- All new fields are optional to maintain backward compatibility
- RLS policies are included for the new tables
- Indexes are created for better performance

If you encounter any issues, please check the Supabase logs and ensure all dependencies are met.
