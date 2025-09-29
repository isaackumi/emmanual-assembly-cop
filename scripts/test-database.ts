/**
 * Test script to verify database is working correctly
 * Run with: npx tsx scripts/test-database.ts
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

async function testDatabase() {
  console.log('🔍 Testing database connection and queries...')

  try {
    // Test 1: Check app_users table
    console.log('\n1. Testing app_users table...')
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, full_name, membership_id, role')
      .limit(5)

    if (usersError) {
      console.error('❌ Error fetching app_users:', usersError)
    } else {
      console.log(`✅ Found ${users?.length || 0} users`)
      users?.forEach(user => {
        console.log(`   - ${user.full_name} (${user.membership_id}) - ${user.role}`)
      })
    }

    // Test 2: Check members table
    console.log('\n2. Testing members table...')
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, dob, date_of_baptism, date_of_holy_ghost_baptism')
      .not('dob', 'is', null)
      .limit(5)

    if (membersError) {
      console.error('❌ Error fetching members:', membersError)
    } else {
      console.log(`✅ Found ${members?.length || 0} members with DOB`)
      members?.forEach(member => {
        console.log(`   - DOB: ${member.dob}, Baptism: ${member.date_of_baptism}, HG: ${member.date_of_holy_ghost_baptism}`)
      })
    }

    // Test 3: Check joined query (members with user data)
    console.log('\n3. Testing joined query (members with user data)...')
    const { data: membersWithUsers, error: joinedError } = await supabase
      .from('members')
      .select(`
        dob,
        date_of_baptism,
        date_of_holy_ghost_baptism,
        user:app_users!inner (
          full_name,
          phone,
          first_name,
          last_name
        )
      `)
      .not('dob', 'is', null)
      .limit(3)

    if (joinedError) {
      console.error('❌ Error fetching members with users:', joinedError)
    } else {
      console.log(`✅ Found ${membersWithUsers?.length || 0} members with user data`)
      membersWithUsers?.forEach(member => {
        console.log(`   - ${member.user?.[0]?.full_name} - DOB: ${member.dob}`)
      })
    }

    // Test 4: Check upcoming events calculation
    console.log('\n4. Testing upcoming events calculation...')
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    let upcomingCount = 0
    if (members) {
      members.forEach(member => {
        if (member.dob) {
          const birthday = new Date(member.dob)
          birthday.setFullYear(today.getFullYear())
          
          if (birthday < today) {
            birthday.setFullYear(today.getFullYear() + 1)
          }
          
          if (birthday >= today && birthday <= thirtyDaysFromNow) {
            upcomingCount++
          }
        }
      })
    }
    
    console.log(`✅ Found ${upcomingCount} upcoming birthdays in next 30 days`)

    console.log('\n🎉 Database tests completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. If you see errors above, run the migration: supabase/migrations/013_remove_all_triggers_final.sql')
    console.log('2. If all tests pass, start the dev server: npm run dev')
    console.log('3. Test the dashboard and members page in the browser')

  } catch (error) {
    console.error('❌ Database test failed:', error)
  }
}

// Run the test
testDatabase()
