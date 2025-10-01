import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TestMember {
  full_name: string
  phone: string
  email?: string
  membership_id: string
  role: string
  join_year: number
  dob: string
  gender: string
  address: string
  status: string
}

const testMembers: TestMember[] = [
  {
    full_name: 'Beatrice Tetteh',
    phone: '+233543245129',
    email: 'beatrice.tetteh@example.com',
    membership_id: 'EA54322021',
    role: 'member',
    join_year: 2021,
    dob: '1990-04-02', // Upcoming birthday
    gender: 'female',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Elizabeth Opoku',
    phone: '+233577208637',
    email: 'elizabeth.opoku@example.com',
    membership_id: 'EA57722020',
    role: 'member',
    join_year: 2020,
    dob: '1985-04-02', // Same day birthday
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'active'
  },
  {
    full_name: 'John Mensah',
    phone: '+233241234567',
    email: 'john.mensah@example.com',
    membership_id: 'EA24122019',
    role: 'elder',
    join_year: 2019,
    dob: '1978-04-05', // Upcoming birthday
    gender: 'male',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Grace Asante',
    phone: '+233244567890',
    email: 'grace.asante@example.com',
    membership_id: 'EA24452022',
    role: 'member',
    join_year: 2022,
    dob: '1992-04-15', // Upcoming birthday
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'active'
  },
  {
    full_name: 'Samuel Boateng',
    phone: '+233247890123',
    email: 'samuel.boateng@example.com',
    membership_id: 'EA24782023',
    role: 'member',
    join_year: 2023,
    dob: '1988-03-25', // Recent birthday (past)
    gender: 'male',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Mary Adjei',
    phone: '+233245678901',
    email: 'mary.adjei@example.com',
    membership_id: 'EA24562018',
    role: 'member',
    join_year: 2018, // Anniversary coming up
    dob: '1983-06-10',
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'active'
  },
  {
    full_name: 'David Osei',
    phone: '+233246789012',
    email: 'david.osei@example.com',
    membership_id: 'EA24672017',
    role: 'member',
    join_year: 2017, // Anniversary coming up
    dob: '1975-08-20',
    gender: 'male',
    address: 'Odorkor, Accra',
    status: 'active'
  },
  {
    full_name: 'Comfort Frimpong',
    phone: '+233248901234',
    email: 'comfort.frimpong@example.com',
    membership_id: 'EA24892024',
    role: 'member',
    join_year: 2024, // Recent member
    dob: '1995-12-05',
    gender: 'female',
    address: 'Gbawe, Accra',
    status: 'visitor'
  }
]

async function seedMembers() {
  try {
    console.log('🌱 Starting to seed members with birthdays and anniversaries...')

    for (const memberData of testMembers) {
      console.log(`\n👤 Creating member: ${memberData.full_name}`)
      
      // First, create the app_user
      const { data: userData, error: userError } = await supabase
        .from('app_users')
        .insert({
          full_name: memberData.full_name,
          phone: memberData.phone,
          email: memberData.email,
          membership_id: memberData.membership_id,
          role: memberData.role,
          join_year: memberData.join_year
        })
        .select()
        .single()

      if (userError) {
        console.error(`❌ Error creating user ${memberData.full_name}:`, userError.message)
        continue
      }

      console.log(`✅ Created user: ${userData.full_name} (ID: ${userData.id})`)

      // Then, create the member profile
      const { data: memberProfileData, error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: userData.id,
          dob: memberData.dob,
          gender: memberData.gender,
          address: memberData.address,
          status: memberData.status,
          emergency_contacts: [
            {
              name: 'Emergency Contact',
              relation: 'Family',
              phone: '+233500000000'
            }
          ],
          documents: {
            id_card: 'uploaded',
            baptism_certificate: 'uploaded'
          }
        })
        .select()
        .single()

      if (memberError) {
        console.error(`❌ Error creating member profile for ${memberData.full_name}:`, memberError.message)
        continue
      }

      console.log(`✅ Created member profile: ${memberData.full_name} (ID: ${memberProfileData.id})`)
    }

    console.log('\n🎉 Successfully seeded members with birthdays and anniversaries!')
    
    // Show upcoming events summary
    console.log('\n📅 Upcoming Birthdays:')
    const upcomingBirthdays = testMembers.filter(member => {
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

    console.log('\n🎂 Upcoming Anniversaries:')
    const upcomingAnniversaries = testMembers.filter(member => {
      const joinDate = new Date(member.join_year, 0, 1) // Approximate join date
      const today = new Date()
      const thisYearAnniversary = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate())
      const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(today.getFullYear() + 1)
      }
      
      return thisYearAnniversary <= next30Days
    })

    upcomingAnniversaries.forEach(member => {
      const yearsSince = new Date().getFullYear() - member.join_year
      console.log(`  - ${member.full_name}: ${yearsSince} years (joined ${member.join_year})`)
    })

  } catch (error) {
    console.error('❌ Error seeding members:', error)
  }
}

// Run the seed function
seedMembers()
