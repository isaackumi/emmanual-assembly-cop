/**
 * Seed script to create sample data with birthdays and anniversaries
 * Run with: npx tsx scripts/seed-sample-events.ts
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

// Helper function to get birthday date for this year (past date)
function getBirthdayForThisYear(dayOfYear: number): string {
  const today = new Date()
  const currentYear = today.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1) // January 1st
  const birthdayThisYear = new Date(startOfYear.getTime() + (dayOfYear - 1) * 24 * 60 * 60 * 1000)
  
  // If birthday has passed this year, use next year
  if (birthdayThisYear > today) {
    return birthdayThisYear.toISOString().split('T')[0]
  } else {
    // Use next year
    const nextYear = currentYear + 1
    const nextYearBirthday = new Date(nextYear, 0, 1)
    nextYearBirthday.setTime(nextYearBirthday.getTime() + (dayOfYear - 1) * 24 * 60 * 60 * 1000)
    return nextYearBirthday.toISOString().split('T')[0]
  }
}

// Sample data with various dates for testing upcoming events
const sampleUsers = [
  {
    // Today's birthday
    full_name: 'John Today Birthday',
    first_name: 'John',
    last_name: 'Today',
    phone: '+233241234567',
    email: 'john.today@example.com',
    membership_id: 'EA12342024',
    role: 'member',
    join_year: 2024,
    dob: '1990-09-28', // Today's date (Sept 28)
    marital_status: 'single'
  },
  {
    // Tomorrow's birthday
    full_name: 'Jane Tomorrow Birthday',
    first_name: 'Jane',
    last_name: 'Tomorrow',
    phone: '+233241234568',
    email: 'jane.tomorrow@example.com',
    membership_id: 'EA12352024',
    role: 'member',
    join_year: 2024,
    dob: '1992-09-29', // Tomorrow's date (Sept 29)
    marital_status: 'married',
    spouse_name: 'John Tomorrow'
  },
  {
    // Birthday in 3 days
    full_name: 'Bob Three Days Birthday',
    first_name: 'Bob',
    last_name: 'ThreeDays',
    phone: '+233241234569',
    email: 'bob.threedays@example.com',
    membership_id: 'EA12362024',
    role: 'elder',
    join_year: 2023,
    dob: '1985-10-01', // 3 days from now (Oct 1)
    marital_status: 'married',
    spouse_name: 'Alice ThreeDays'
  },
  {
    // Birthday in 7 days
    full_name: 'Alice Week Birthday',
    first_name: 'Alice',
    last_name: 'Week',
    phone: '+233241234570',
    email: 'alice.week@example.com',
    membership_id: 'EA12372024',
    role: 'member',
    join_year: 2022,
    dob: '1988-10-05', // 7 days from now (Oct 5)
    marital_status: 'single'
  },
  {
    // Anniversary today
    full_name: 'David Today Anniversary',
    first_name: 'David',
    last_name: 'TodayAnniversary',
    phone: '+233241234571',
    email: 'david.today@example.com',
    membership_id: 'EA12382024',
    role: 'member',
    join_year: 2020,
    dob: '1985-06-15',
    marital_status: 'married',
    spouse_name: 'Sarah TodayAnniversary',
    date_of_baptism: new Date().toISOString().split('T')[0] // Today's anniversary
  },
  {
    // Anniversary in 5 days
    full_name: 'Sarah Five Days Anniversary',
    first_name: 'Sarah',
    last_name: 'FiveDays',
    phone: '+233241234572',
    email: 'sarah.fivedays@example.com',
    membership_id: 'EA12392024',
    role: 'member',
    join_year: 2019,
    dob: '1988-09-22',
    marital_status: 'married',
    spouse_name: 'David FiveDays',
    date_of_baptism: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 5 days from now
  },
  {
    // Holy Ghost baptism anniversary in 10 days
    full_name: 'Michael Holy Ghost Anniversary',
    first_name: 'Michael',
    last_name: 'HolyGhost',
    phone: '+233241234573',
    email: 'michael.holyghost@example.com',
    membership_id: 'EA12402024',
    role: 'pastor',
    join_year: 2018,
    dob: '1980-03-10',
    marital_status: 'married',
    spouse_name: 'Grace HolyGhost',
    date_of_baptism: '2018-01-15',
    holy_ghost_baptism: true,
    date_of_holy_ghost_baptism: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 10 days from now
  },
  {
    // Regular member with no upcoming events
    full_name: 'Regular Member',
    first_name: 'Regular',
    last_name: 'Member',
    phone: '+233241234574',
    email: 'regular.member@example.com',
    membership_id: 'EA12412024',
    role: 'member',
    join_year: 2021,
    dob: '1990-12-25',
    marital_status: 'single',
    date_of_baptism: '2021-03-15'
  }
]

async function seedSampleEvents() {
  console.log('🌱 Seeding sample data for upcoming events...')

  try {
    for (const userData of sampleUsers) {
      console.log(`Creating user: ${userData.full_name}`)
      
      // Create app_users entry
      const { data: user, error: userError } = await supabase
        .from('app_users')
        .insert({
          full_name: userData.full_name,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          email: userData.email,
          membership_id: userData.membership_id,
          role: userData.role,
          join_year: userData.join_year,
          marital_status: userData.marital_status,
          spouse_name: userData.spouse_name
        })
        .select()
        .single()

      if (userError) {
        console.error(`Error creating user ${userData.full_name}:`, userError)
        continue
      }

      // Create members entry
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          status: 'active',
          dob: userData.dob,
          gender: userData.full_name.includes('Jane') || userData.full_name.includes('Alice') || userData.full_name.includes('Sarah') || userData.full_name.includes('Grace') ? 'female' : 'male',
          date_of_baptism: userData.date_of_baptism,
          holy_ghost_baptism: userData.holy_ghost_baptism || false,
          date_of_holy_ghost_baptism: userData.date_of_holy_ghost_baptism,
          address: `${userData.full_name.split(' ')[1]} Street, Accra`,
          documents: []
        })

      if (memberError) {
        console.error(`Error creating member profile for ${userData.full_name}:`, memberError)
      }
    }

    console.log('✅ Sample events data seeded successfully!')
    console.log('\n📅 Upcoming Events Summary:')
    console.log('• Today: John Today Birthday, David Today Anniversary')
    console.log('• Tomorrow: Jane Tomorrow Birthday')
    console.log('• 3 days: Bob Three Days Birthday')
    console.log('• 5 days: Sarah Five Days Anniversary')
    console.log('• 7 days: Alice Week Birthday')
    console.log('• 10 days: Michael Holy Ghost Anniversary')
    console.log('\n🧪 Test the upcoming events on: /members')

  } catch (error) {
    console.error('❌ Error seeding sample events data:', error)
  }
}

// Run the seed function
seedSampleEvents()
