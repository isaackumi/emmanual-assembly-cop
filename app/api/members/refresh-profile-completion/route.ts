import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role from app_users table
    const { data: appUser, error: userError } = await supabase
      .from('app_users')
      .select('role')
      .eq('auth_uid', user.id)
      .single()

    if (userError || !appUser || !['admin', 'pastor', 'elder'].includes(appUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Call the refresh function
    const { data, error } = await supabase.rpc('refresh_all_profile_completions')
    
    if (error) {
      console.error('Error refreshing profile completions:', error)
      return NextResponse.json({ error: 'Failed to refresh profile completions' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      updated_count: data,
      message: `Successfully updated ${data} member profiles` 
    })

  } catch (error) {
    console.error('Error in refresh-profile-completion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
