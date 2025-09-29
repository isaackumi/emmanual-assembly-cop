import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSProvider {
  name: string
  sendSMS: (phone: string, message: string) => Promise<{ success: boolean; messageId?: string; error?: string }>
}

// Twilio SMS Provider
class TwilioProvider implements SMSProvider {
  name = 'twilio'
  
  async sendSMS(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')
      
      if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio credentials not configured')
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: phone,
            Body: message,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Twilio API error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.sid
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Africa's Talking SMS Provider
class AfricasTalkingProvider implements SMSProvider {
  name = 'africas_talking'
  
  async sendSMS(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY')
      const username = Deno.env.get('AFRICAS_TALKING_USERNAME')
      
      if (!apiKey || !username) {
        throw new Error('Africa\'s Talking credentials not configured')
      }

      const response = await fetch(
        'https://api.africastalking.com/version1/messaging',
        {
          method: 'POST',
          headers: {
            'ApiKey': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: username,
            to: phone,
            message: message,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Africa's Talking API error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.SMSMessageData?.Recipients?.[0]?.messageId
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Mock SMS Provider for development
class MockProvider implements SMSProvider {
  name = 'mock'
  
  async sendSMS(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[MOCK SMS] To: ${phone}, Message: ${message}`)
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }
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

    const { phone, message, message_type = 'general', user_id, priority = 'normal' } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number and message are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine SMS provider
    const providerType = Deno.env.get('SMS_PROVIDER') || 'mock'
    let provider: SMSProvider

    switch (providerType) {
      case 'twilio':
        provider = new TwilioProvider()
        break
      case 'africas_talking':
        provider = new AfricasTalkingProvider()
        break
      default:
        provider = new MockProvider()
    }

    // Send SMS
    const result = await provider.sendSMS(phone, message)

    // Log SMS attempt
    const { data: logData, error: logError } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user_id || null,
        action: 'SMS_SENT',
        table_name: 'sms_logs',
        new_values: {
          phone: phone,
          message_type: message_type,
          provider: provider.name,
          success: result.success,
          message_id: result.messageId,
          error: result.error,
          priority: priority,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to log SMS:', logError)
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error,
          provider: provider.name,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        provider: provider.name,
        timestamp: new Date().toISOString(),
        message: 'SMS sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('SMS dispatcher error:', error)
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
