import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportJob {
  id: string
  type: 'attendance' | 'members' | 'donations' | 'pledges'
  config: {
    format: 'csv' | 'xlsx'
    filters?: Record<string, any>
    date_range?: {
      start: string
      end: string
    }
  }
  requested_by: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending export jobs
    const { data: pendingJobs, error: fetchError } = await supabaseClient
      .from('export_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (fetchError) {
      console.error('Error fetching pending jobs:', fetchError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch pending jobs' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending export jobs',
          processed: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results = []

    for (const job of pendingJobs) {
      try {
        // Mark job as processing
        await supabaseClient
          .from('export_jobs')
          .update({ 
            status: 'processing',
            started_at: new Date().toISOString()
          })
          .eq('id', job.id)

        let exportData = null
        let fileName = ''

        // Fetch data based on job type
        switch (job.type) {
          case 'attendance':
            exportData = await exportAttendanceData(supabaseClient, job.config)
            fileName = `attendance_${job.id}.${job.config.format}`
            break
          case 'members':
            exportData = await exportMembersData(supabaseClient, job.config)
            fileName = `members_${job.id}.${job.config.format}`
            break
          case 'donations':
            exportData = await exportDonationsData(supabaseClient, job.config)
            fileName = `donations_${job.id}.${job.config.format}`
            break
          case 'pledges':
            exportData = await exportPledgesData(supabaseClient, job.config)
            fileName = `pledges_${job.id}.${job.config.format}`
            break
          default:
            throw new Error(`Unsupported export type: ${job.type}`)
        }

        // Generate file content
        let fileContent = ''
        let contentType = ''

        if (job.config.format === 'csv') {
          fileContent = generateCSV(exportData)
          contentType = 'text/csv'
        } else if (job.config.format === 'xlsx') {
          // For XLSX, we'll store as CSV for now (can be enhanced with actual XLSX generation)
          fileContent = generateCSV(exportData)
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('exports')
          .upload(fileName, fileContent, {
            contentType,
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('exports')
          .getPublicUrl(fileName)

        // Mark job as completed
        await supabaseClient
          .from('export_jobs')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            file_url: urlData.publicUrl,
            file_name: fileName
          })
          .eq('id', job.id)

        results.push({
          jobId: job.id,
          status: 'completed',
          fileUrl: urlData.publicUrl,
          fileName: fileName
        })

      } catch (error) {
        console.error(`Export job ${job.id} failed:`, error)
        
        // Mark job as failed
        await supabaseClient
          .from('export_jobs')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', job.id)

        results.push({
          jobId: job.id,
          status: 'failed',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.length} export jobs`,
        results: results,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Scheduled exports error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Export data functions
async function exportAttendanceData(supabaseClient: any, config: any) {
  let query = supabaseClient
    .from('attendance')
    .select(`
      id,
      service_date,
      service_type,
      check_in_time,
      method,
      members!inner (
        user_id,
        app_users!inner (
          full_name,
          membership_id,
          phone
        )
      ),
      dependants (
        name,
        relationship
      )
    `)

  if (config.date_range) {
    query = query
      .gte('service_date', config.date_range.start)
      .lte('service_date', config.date_range.end)
  }

  const { data, error } = await query.order('service_date', { ascending: false })

  if (error) throw error
  return data || []
}

async function exportMembersData(supabaseClient: any, config: any) {
  const { data, error } = await supabaseClient
    .from('app_users')
    .select(`
      *,
      members (*),
      dependants (
        name,
        relationship,
        dob
      )
    `)
    .eq('role', 'member')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function exportDonationsData(supabaseClient: any, config: any) {
  let query = supabaseClient
    .from('donations')
    .select(`
      *,
      members!inner (
        app_users!inner (
          full_name,
          membership_id
        )
      )
    `)

  if (config.date_range) {
    query = query
      .gte('donation_date', config.date_range.start)
      .lte('donation_date', config.date_range.end)
  }

  const { data, error } = await query.order('donation_date', { ascending: false })

  if (error) throw error
  return data || []
}

async function exportPledgesData(supabaseClient: any, config: any) {
  const { data, error } = await supabaseClient
    .from('pledges')
    .select(`
      *,
      members!inner (
        app_users!inner (
          full_name,
          membership_id
        )
      )
    `)
    .order('pledge_date', { ascending: false })

  if (error) throw error
  return data || []
}

// CSV generation
function generateCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = getNestedValue(row, header)
        // Escape commas and quotes
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )
  ].join('\n')

  return csvContent
}

// Helper function to get nested values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj) || ''
}
