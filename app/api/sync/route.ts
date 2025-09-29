import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Attendance } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { table_name, operation, data, client_uuid } = await request.json()

    if (!table_name || !operation || !data || !client_uuid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if record already exists (idempotency)
    if (table_name === 'attendance' && operation === 'INSERT') {
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('id')
        .eq('client_uuid', client_uuid)
        .single()

      if (existingRecord) {
        return NextResponse.json({
          success: true,
          message: 'Record already exists',
          id: existingRecord.id
        })
      }
    }

    let result
    let error

    switch (table_name) {
      case 'attendance':
        if (operation === 'INSERT') {
          const attendanceData: Omit<Attendance, 'id' | 'created_at'> = {
            member_id: data.member_id,
            dependant_id: data.dependant_id,
            service_date: data.service_date,
            service_type: data.service_type,
            check_in_time: data.check_in_time || new Date().toISOString(),
            method: data.method || 'mobile',
            metadata: data.metadata || {},
            client_uuid: client_uuid,
            created_by: data.created_by
          }

          const { data: insertedData, error: insertError } = await supabase
            .from('attendance')
            .insert(attendanceData)
            .select()
            .single()

          result = insertedData
          error = insertError
        } else {
          return NextResponse.json(
            { error: 'Unsupported operation for attendance table' },
            { status: 400 }
          )
        }
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported table' },
          { status: 400 }
        )
    }

    if (error) {
      console.error('Sync error:', error)
      return NextResponse.json(
        { error: 'Failed to sync data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Data synced successfully'
    })

  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests for sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const client_uuid = searchParams.get('client_uuid')

    if (!client_uuid) {
      return NextResponse.json(
        { error: 'client_uuid is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if record exists
    const { data, error } = await supabase
      .from('attendance')
      .select('id, client_uuid, created_at')
      .eq('client_uuid', client_uuid)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Status check error:', error)
      return NextResponse.json(
        { error: 'Failed to check sync status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exists: !!data,
      synced: !!data,
      synced_at: data?.created_at || null
    })

  } catch (error) {
    console.error('Status check API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
