/**
 * Check current data in database
 * Run with: npx tsx scripts/check-current-data.ts
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

async function checkCurrentData() {
  console.log('🔍 Checking current data in database...')

  try {
    // Get all members with their user data
    const { data: members, error } = await supabase
      .from('members')
      .select(`
        id,
        dob,
        date_of_baptism,
        date_of_holy_ghost_baptism,
        user:app_users!inner (
          full_name,
          membership_id
        )
      `)

    if (error) {
      console.error('Error fetching data:', error)
      return
    }

    console.log(`\nFound ${members?.length || 0} members:`)
    
    const today = new Date()
    
    members?.forEach((member, index) => {
      console.log(`\n${index + 1}. ${member.user?.[0]?.full_name} (${member.user?.[0]?.membership_id})`)
      console.log(`   DOB: ${member.dob || 'Not set'}`)
      console.log(`   Baptism: ${member.date_of_baptism || 'Not set'}`)
      console.log(`   Holy Ghost: ${member.date_of_holy_ghost_baptism || 'Not set'}`)
      
      if (member.dob) {
        const dob = new Date(member.dob)
        const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
        
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1)
        }
        
        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntil <= 30) {
          console.log(`   🎂 Birthday in ${daysUntil} days (${thisYearBirthday.toDateString()})`)
        } else {
          console.log(`   🎂 Birthday in ${daysUntil} days (too far)`)
        }
      }
    })

  } catch (error) {
    console.error('❌ Error checking data:', error)
  }
}

// Run the check
checkCurrentData()
