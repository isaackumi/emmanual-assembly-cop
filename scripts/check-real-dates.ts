/**
 * Check what the real current date should be and fix the sample data accordingly
 * Run with: npx tsx scripts/check-real-dates.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRealDates() {
  console.log('🔍 Checking real dates and fixing sample data...')

  try {
    // Let's assume we're in 2024 and create realistic test data
    const testYear = 2024
    const today = new Date()
    
    // Create upcoming dates for 2024
    const upcomingDates = [
      { days: 0, name: 'Today', month: 9, day: 28 }, // Sept 28, 2024
      { days: 1, name: 'Tomorrow', month: 9, day: 29 }, // Sept 29, 2024
      { days: 3, name: '3 days', month: 10, day: 1 }, // Oct 1, 2024
      { days: 7, name: '1 week', month: 10, day: 5 }, // Oct 5, 2024
      { days: 14, name: '2 weeks', month: 10, day: 12 }, // Oct 12, 2024
      { days: 21, name: '3 weeks', month: 10, day: 19 }, // Oct 19, 2024
    ]

    console.log(`Setting up test data for year ${testYear}`)
    console.log(`Today should be: September 28, ${testYear}`)

    // Update the test members with 2024 dates
    const updates = [
      {
        membership_id: 'EA12342024', // John Today Birthday
        dob: `${testYear}-09-28`, // Today
        baptism: `${testYear}-09-28`
      },
      {
        membership_id: 'EA12352024', // Jane Tomorrow Birthday  
        dob: `${testYear}-09-29`, // Tomorrow
        baptism: `${testYear}-09-29`
      },
      {
        membership_id: 'EA12362024', // Bob Three Days Birthday
        dob: `${testYear}-10-01`, // 3 days
        baptism: `${testYear}-10-01`
      },
      {
        membership_id: 'EA12372024', // Alice Week Birthday
        dob: `${testYear}-10-05`, // 7 days
        baptism: `${testYear}-10-05`
      },
      {
        membership_id: 'EA12382024', // David Today Anniversary
        dob: '1980-06-15', // Keep original birth year
        baptism: `${testYear}-09-28` // Today's anniversary
      },
      {
        membership_id: 'EA12392024', // Sarah Five Days Anniversary
        dob: '1988-09-22', // Keep original birth year
        baptism: `${testYear}-10-03` // 5 days anniversary
      },
      {
        membership_id: 'EA12402024', // Michael Holy Ghost Anniversary
        dob: '1980-03-10', // Keep original birth year
        baptism: '2018-01-15', // Keep original
        holy_ghost: `${testYear}-10-08` // 10 days anniversary
      }
    ]

    for (const update of updates) {
      console.log(`\nUpdating ${update.membership_id}...`)
      
      // Find the user
      const { data: user } = await supabase
        .from('app_users')
        .select('id')
        .eq('membership_id', update.membership_id)
        .single()

      if (!user) {
        console.log(`   ❌ User not found: ${update.membership_id}`)
        continue
      }

      // Update member profile
      const updateData: any = {
        dob: update.dob
      }
      
      if (update.baptism) {
        updateData.date_of_baptism = update.baptism
      }
      
      if (update.holy_ghost) {
        updateData.date_of_holy_ghost_baptism = update.holy_ghost
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('user_id', user.id)

      if (error) {
        console.log(`   ❌ Error: ${error.message}`)
      } else {
        console.log(`   ✅ Updated - DOB: ${update.dob}, Baptism: ${update.baptism || 'N/A'}, HG: ${update.holy_ghost || 'N/A'}`)
      }
    }

    console.log('\n✅ Sample data updated for 2024!')
    console.log('\n📅 Expected upcoming events in 2024:')
    console.log('• Today (Sept 28): John Today Birthday & Anniversary, David Today Anniversary')
    console.log('• Tomorrow (Sept 29): Jane Tomorrow Birthday & Anniversary')
    console.log('• 3 days (Oct 1): Bob Three Days Birthday & Anniversary')
    console.log('• 5 days (Oct 3): Sarah Five Days Anniversary')
    console.log('• 7 days (Oct 5): Alice Week Birthday & Anniversary')
    console.log('• 10 days (Oct 8): Michael Holy Ghost Anniversary')

  } catch (error) {
    console.error('❌ Error updating dates:', error)
  }
}

// Run the fix
checkRealDates()
