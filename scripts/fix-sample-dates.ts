/**
 * Fix sample data with upcoming dates for testing
 * Run with: npx tsx scripts/fix-sample-dates.ts
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

async function fixSampleDates() {
  console.log('🔧 Fixing sample data with upcoming dates...')

  try {
    // Get current date
    const today = new Date()
    
    // Create dates for upcoming events (next 30 days)
    const upcomingDates = [
      { days: 0, name: 'Today' },
      { days: 1, name: 'Tomorrow' },
      { days: 3, name: '3 days' },
      { days: 7, name: '1 week' },
      { days: 14, name: '2 weeks' },
      { days: 21, name: '3 weeks' }
    ]

    // Get existing members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, user_id, user:app_users!inner(full_name, membership_id)')
      .limit(6)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return
    }

    console.log(`Found ${members?.length || 0} members to update`)

    // Update each member with upcoming dates
    for (let i = 0; i < Math.min(members?.length || 0, upcomingDates.length); i++) {
      const member = members![i]
      const dateInfo = upcomingDates[i]
      
      // Calculate the upcoming date
      const upcomingDate = new Date(today)
      upcomingDate.setDate(today.getDate() + dateInfo.days)
      
      // Use a past birth year (e.g., 30 years ago)
      const birthYear = upcomingDate.getFullYear() - 30
      const dob = new Date(birthYear, upcomingDate.getMonth(), upcomingDate.getDate())
      
      console.log(`Updating ${member.user?.[0]?.full_name} with DOB: ${dob.toISOString().split('T')[0]} (${dateInfo.name})`)

      // Update the member's DOB
      const { error: updateError } = await supabase
        .from('members')
        .update({ 
          dob: dob.toISOString().split('T')[0],
          date_of_baptism: dateInfo.days <= 7 ? dob.toISOString().split('T')[0] : null // Add baptism date for some
        })
        .eq('id', member.id)

      if (updateError) {
        console.error(`Error updating member ${member.user?.[0]?.full_name}:`, updateError)
      } else {
        console.log(`✅ Updated ${member.user?.[0]?.full_name}`)
      }
    }

    console.log('\n✅ Sample dates updated successfully!')
    console.log('\n📅 Upcoming events should now show:')
    console.log('• Today: Birthday & Baptism Anniversary')
    console.log('• Tomorrow: Birthday')
    console.log('• 3 days: Birthday & Baptism Anniversary')
    console.log('• 1 week: Birthday')
    console.log('• 2 weeks: Birthday')
    console.log('• 3 weeks: Birthday')

  } catch (error) {
    console.error('❌ Error fixing sample dates:', error)
  }
}

// Run the fix
fixSampleDates()
