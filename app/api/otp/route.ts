import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeMembershipId, isValidPhone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { phoneOrId, action } = await request.json()

    if (!phoneOrId || !action) {
      return NextResponse.json(
        { error: 'Phone number or membership ID and action are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    let phone = phoneOrId.trim()
    let userId = null

    // Check if input is a membership ID
    if (phoneOrId.toUpperCase().includes('EA')) {
      const normalizedId = normalizeMembershipId(phoneOrId)
      
      // Look up user by membership ID
      const { data: user, error: userError } = await supabase
        .from('app_users')
        .select('id, phone')
        .eq('membership_id', normalizedId)
        .single()

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Membership ID not found' },
          { status: 404 }
        )
      }

      if (!user.phone) {
        return NextResponse.json(
          { error: 'No phone number associated with this membership ID' },
          { status: 400 }
        )
      }

      phone = user.phone
      userId = user.id
    } else {
      // Validate phone number format
      if (!isValidPhone(phone)) {
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
      const { data: user, error: userError } = await supabase
        .from('app_users')
        .select('id, phone')
        .eq('phone', phone)
        .single()

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Phone number not found in system' },
          { status: 404 }
        )
      }

      userId = user.id
    }

    if (action === 'send') {
      // Send OTP via Supabase Auth
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          channel: 'sms'
        }
      })

      if (otpError) {
        console.error('OTP Error:', otpError)
        return NextResponse.json(
          { error: 'Failed to send OTP' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'OTP sent successfully',
        phone: phone // Return formatted phone for client
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('OTP API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
