import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Insert heartbeat record
    const { data, error } = await supabaseClient
      .from('heartbeat')
      .insert({
        service_name: 'keep-alive',
        status: 'healthy',
        last_ping: new Date().toISOString(),
        metadata: {
          user_agent: req.headers.get('user-agent') || 'unknown',
          timestamp: Date.now(),
          environment: Deno.env.get('ENVIRONMENT') || 'production'
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Heartbeat error:', error)
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

    // Clean up old heartbeat records (keep only last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    await supabaseClient
      .from('heartbeat')
      .delete()
      .lt('last_ping', oneDayAgo)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        timestamp: new Date().toISOString(),
        message: 'Heartbeat recorded successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Keep-alive function error:', error)
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
