/**
 * Update existing sample users with correct birthday/anniversary dates
 * Run with: npx tsx scripts/update-sample-events.ts
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

// Update data with various dates for testing upcoming events
const updates = [
  {
    membership_id: 'EA12342024', // John Today Birthday
    dob: '1990-09-28', // Today's date (Sept 28)
    date_of_baptism: '2020-09-28' // Today's anniversary
  },
  {
    membership_id: 'EA12352024', // Jane Tomorrow Birthday
    dob: '1992-09-29', // Tomorrow's date (Sept 29)
    date_of_baptism: '2021-09-29' // Tomorrow's anniversary
  },
  {
    membership_id: 'EA12362024', // Bob Three Days Birthday
    dob: '1985-10-01', // 3 days from now (Oct 1)
    date_of_baptism: '2020-10-01' // 3 days anniversary
  },
  {
    membership_id: 'EA12372024', // Alice Week Birthday
    dob: '1988-10-05', // 7 days from now (Oct 5)
    date_of_baptism: '2021-10-05' // 7 days anniversary
  },
  {
    membership_id: 'EA12382024', // David Today Anniversary
    dob: '1980-06-15',
    date_of_baptism: '2020-09-28' // Today's anniversary
  },
  {
    membership_id: 'EA12392024', // Sarah Five Days Anniversary
    dob: '1988-09-22',
    date_of_baptism: '2020-10-03' // 5 days from now
  },
  {
    membership_id: 'EA12402024', // Michael Holy Ghost Anniversary
    dob: '1980-03-10',
    date_of_baptism: '2018-01-15',
    holy_ghost_baptism: true,
    date_of_holy_ghost_baptism: '2018-10-08' // 10 days from now
  },
  {
    membership_id: 'EA12412024', // Regular Member
    dob: '1990-12-25',
    date_of_baptism: '2021-03-15'
  }
]

async function updateSampleEvents() {
  console.log('🔄 Updating existing sample users with correct dates...')

  try {
    for (const update of updates) {
      console.log(`Updating user with membership ID: ${update.membership_id}`)
      
      // Find the user
      const { data: user, error: userError } = await supabase
        .from('app_users')
        .select('id')
        .eq('membership_id', update.membership_id)
        .single()

      if (userError || !user) {
        console.error(`User not found for membership ID ${update.membership_id}:`, userError)
        continue
      }

      // Find the member profile
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (memberError || !member) {
        console.error(`Member profile not found for user ${user.id}:`, memberError)
        continue
      }

      // Update the member profile with new dates
      const { error: updateError } = await supabase
        .from('members')
        .update({
          dob: update.dob,
          date_of_baptism: update.date_of_baptism,
          holy_ghost_baptism: update.holy_ghost_baptism || false,
          date_of_holy_ghost_baptism: update.date_of_holy_ghost_baptism || null
        })
        .eq('id', member.id)

      if (updateError) {
        console.error(`Error updating member ${member.id}:`, updateError)
      } else {
        console.log(`✅ Updated member ${update.membership_id}`)
      }
    }

    console.log('✅ Sample events data updated successfully!')
    console.log('\n📅 Upcoming Events Summary:')
    console.log('• Today: John Today Birthday & Anniversary, David Today Anniversary')
    console.log('• Tomorrow: Jane Tomorrow Birthday & Anniversary')
    console.log('• 3 days: Bob Three Days Birthday & Anniversary')
    console.log('• 5 days: Sarah Five Days Anniversary')
    console.log('• 7 days: Alice Week Birthday & Anniversary')
    console.log('• 10 days: Michael Holy Ghost Anniversary')
    console.log('\n🧪 Test the upcoming events on: /members')

  } catch (error) {
    console.error('❌ Error updating sample events data:', error)
  }
}

// Run the update function
updateSampleEvents()
