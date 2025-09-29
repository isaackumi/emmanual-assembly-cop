# Fix for Infinite Recursion in app_users Policy

## Problem

After adding the enhanced member profile migration, there's an infinite recursion detected in the policy for the `app_users` relation. This happens because the profile completion triggers are causing infinite updates.

## Solution

Run the following SQL migrations in your Supabase SQL Editor to fix the issue:

### Step 1: Run Migration 005 (if needed)

Copy and run the SQL from `supabase/migrations/005_fix_policy_recursion.sql`

### Step 2: Run Migration 006 (Recommended)

Copy and run the SQL from `supabase/migrations/006_disable_auto_profile_completion.sql`

This migration:

- ✅ Removes all problematic triggers that cause recursion
- ✅ Creates safer functions for manual profile completion updates
- ✅ Updates existing users with their current profile completion
- ✅ Prevents infinite loops

## What Changed

1. **Removed Automatic Triggers**: No more automatic profile completion updates that cause recursion
2. **Manual Updates**: Profile completion is now updated manually when members are added/edited
3. **Safer Functions**: New functions that can be called safely without causing recursion
4. **One-time Refresh**: All existing members get their profile completion calculated once

## Testing

After running the migration:

1. Try adding a new member - it should work without recursion errors
2. Check that profile completion is calculated correctly
3. Verify that member profiles display properly

## Manual Profile Completion Update

If you need to refresh all profile completions later, you can call:

```sql
SELECT refresh_all_profile_completions();
```

Or use the API endpoint: `POST /api/members/refresh-profile-completion`

The system will now work without recursion issues while still providing accurate profile completion tracking.
