import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeMembershipId } from '@/lib/membershipId'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    console.log('Direct login API called')
    const { phoneOrId } = await request.json()
    console.log('Received phoneOrId:', phoneOrId)

    if (!phoneOrId?.trim()) {
      console.log('No phoneOrId provided')
      return NextResponse.json(
        { error: 'Phone number or membership ID is required' },
        { status: 400 }
      )
    }

    let phone = phoneOrId.trim()
    let userData = null

    // Check if input is a membership ID
    if (phoneOrId.toUpperCase().includes('EA')) {
      console.log('Processing membership ID')
      const normalizedId = normalizeMembershipId(phoneOrId)
      console.log('Normalized ID:', normalizedId)

      // Look up user by membership ID using maybeSingle to handle no results gracefully
      console.log('Looking up membership ID:', normalizedId)
      const { data: user, error: userError } = await supabaseAdmin
        .from('app_users')
        .select('phone, auth_uid, full_name, id, role')
        .eq('membership_id', normalizedId)
        .maybeSingle()

      console.log('User lookup result:', { user, userError })

      if (userError) {
        console.log('Database error:', userError)
        return NextResponse.json(
          { error: 'Database error occurred' },
          { status: 500 }
        )
      }

      if (!user) {
        console.log('User not found')
        return NextResponse.json(
          { error: 'Membership ID not found' },
          { status: 404 }
        )
      }

      userData = user

      if (!userData.auth_uid) {
        return NextResponse.json(
          { error: 'Account not properly set up' },
          { status: 400 }
        )
      }

      phone = userData.phone
    } else {
      // Validate phone number format
      const phoneRegex = /^(\+233|0)?[0-9]{9}$/
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        )
      }

      // Format phone number for Ghana
      if (phone.startsWith('0')) {
        phone = '+233' + phone.slice(1)
      } else if (!phone.startsWith('+')) {
        phone = '+233' + phone
      }

      // Check if phone exists in system
      const { data: user, error: userError } = await supabaseAdmin
        .from('app_users')
        .select('phone, auth_uid, full_name, id, role')
        .eq('phone', phone)
        .single()

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Phone number not found' },
          { status: 404 }
        )
      }

      if (!user.auth_uid) {
        return NextResponse.json(
          { error: 'Account not properly set up' },
          { status: 400 }
        )
      }

      userData = user
    }

    // For testing purposes, we'll return the user data
    // The client will handle creating a session
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone,
        auth_uid: userData.auth_uid
      }
    })

  } catch (error) {
    console.error('Direct login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
