import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MemberProfile {
  full_name: string
  membership_id: string
  dob: string
  gender: string
  address: string
  status: string
}

const memberProfiles: MemberProfile[] = [
  {
    full_name: 'Beatrice Tetteh',
    membership_id: 'EA54322021',
    dob: '1990-04-02', // Upcoming birthday
    gender: 'female',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Elizabeth Opoku',
    membership_id: 'EA57722020',
    dob: '1985-04-02', // Same day birthday
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'active'
  },
  {
    full_name: 'John Mensah',
    membership_id: 'EA24122019',
    dob: '1978-04-05', // Upcoming birthday
    gender: 'male',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Grace Asante',
    membership_id: 'EA24452022',
    dob: '1992-04-15', // Upcoming birthday
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'active'
  },
  {
    full_name: 'Samuel Boateng',
    membership_id: 'EA24782023',
    dob: '1988-03-25', // Recent birthday (past)
    gender: 'male',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Mary Adjei',
    membership_id: 'EA24562018',
    dob: '1983-06-10',
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'active'
  },
  {
    full_name: 'David Osei',
    membership_id: 'EA24672017',
    dob: '1975-08-20',
    gender: 'male',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Comfort Frimpong',
    membership_id: 'EA24892024',
    dob: '1995-12-05',
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'visitor'
  }
]

async function seedMemberProfiles() {
  try {
    console.log('🌱 Starting to seed member profiles...')

    for (const profile of memberProfiles) {
      console.log(`\n👤 Creating member profile for: ${profile.full_name}`)
      
      // First, find the user by membership_id
      const { data: userData, error: userError } = await supabase
        .from('app_users')
        .select('id')
        .eq('membership_id', profile.membership_id)
        .single()

      if (userError) {
        console.error(`❌ Error finding user ${profile.full_name}:`, userError.message)
        continue
      }

      // Check if member profile already exists
      const { data: existingMember, error: checkError } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', userData.id)
        .single()

      if (existingMember) {
        console.log(`⚠️  Member profile already exists for ${profile.full_name}, updating...`)
        
        // Update existing profile
        const { error: updateError } = await supabase
          .from('members')
          .update({
            dob: profile.dob,
            gender: profile.gender,
            address: profile.address,
            status: profile.status,
            emergency_contacts: [
              {
                name: 'Emergency Contact',
                relation: 'Family',
                phone: '+233500000000'
              }
            ],
            documents: [
              {
                type: 'id_card',
                status: 'uploaded',
                uploaded_at: new Date().toISOString()
              },
              {
                type: 'baptism_certificate',
                status: 'uploaded',
                uploaded_at: new Date().toISOString()
              }
            ]
          })
          .eq('user_id', userData.id)

        if (updateError) {
          console.error(`❌ Error updating member profile for ${profile.full_name}:`, updateError.message)
          continue
        }
        
        console.log(`✅ Updated member profile: ${profile.full_name}`)
        continue
      }

      // Create new member profile
      const { data: memberProfileData, error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: userData.id,
          dob: profile.dob,
          gender: profile.gender,
          address: profile.address,
          status: profile.status,
          emergency_contacts: [
            {
              name: 'Emergency Contact',
              relation: 'Family',
              phone: '+233500000000'
            }
          ],
          documents: [
            {
              type: 'id_card',
              status: 'uploaded',
              uploaded_at: new Date().toISOString()
            },
            {
              type: 'baptism_certificate',
              status: 'uploaded',
              uploaded_at: new Date().toISOString()
            }
          ]
        })
        .select()
        .single()

      if (memberError) {
        console.error(`❌ Error creating member profile for ${profile.full_name}:`, memberError.message)
        continue
      }

      console.log(`✅ Created member profile: ${profile.full_name} (ID: ${memberProfileData.id})`)
    }

    console.log('\n🎉 Successfully seeded member profiles!')
    
    // Show upcoming events summary
    console.log('\n📅 Upcoming Birthdays:')
    const upcomingBirthdays = memberProfiles.filter(member => {
      const birthDate = new Date(member.dob)
      const today = new Date()
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
      const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1)
      }
      
      return thisYearBirthday <= next30Days
    })

    upcomingBirthdays.forEach(member => {
      const birthDate = new Date(member.dob)
      const monthDay = birthDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      console.log(`  - ${member.full_name}: ${monthDay}`)
    })

  } catch (error) {
    console.error('❌ Error seeding member profiles:', error)
  }
}

// Run the seed function
seedMemberProfiles()
