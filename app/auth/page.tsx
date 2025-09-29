'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Church, Phone, ArrowRight, Shield, Users, Heart, MessageCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { setTestUser } from '@/lib/auth-utils'

export default function AuthPage() {
  const [phoneOrId, setPhoneOrId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDirectLogin = async () => {
    console.log('Login attempt started with:', phoneOrId)
    
    if (!phoneOrId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your phone number or membership ID",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    console.log('Loading set to true')
    
    try {
      // Call the direct login API
      console.log('Calling API with:', { phoneOrId })
      const response = await fetch('/api/auth/direct-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneOrId }),
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (data.success && data.user) {
        console.log('Login successful, setting test user:', data.user)
        
        // Set the test user in localStorage
        setTestUser(data.user)
        
        toast({
          title: "Welcome back!",
          description: `Hello ${data.user.full_name}`,
        })

        // Redirect to dashboard
        console.log('Redirecting to dashboard...')
        router.push('/dashboard')
      } else {
        throw new Error(data.error || 'Invalid credentials')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Dark Blue Background */}
      <div className="hidden lg:flex lg:w-3/5 lg:flex-col lg:justify-center lg:px-20 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: 'url(/login-bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}></div>
        </div>

        <div className="relative z-10 max-w-2xl">
          {/* Main Heading */}
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-white leading-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              <div>Empower Your</div>
              <div className="text-yellow-300">Spiritual Journey</div>
            </h1>
          </div>

          {/* Description */}
          <div className="mb-16">
            <p className="text-xl leading-relaxed max-w-lg text-white">
              Our streamlined church management system makes it easy for you to 
              <span className="text-yellow-300 font-semibold"> connect with your church family</span>, 
              <span className="text-blue-200"> track your spiritual growth</span>, and stay engaged with 
              <span className="text-yellow-400 font-semibold"> Emmanuel Assembly activities</span>. 
              Let's get started on your digital church experience.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - White Background */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Logo and Program Name */}
          <div className="flex items-center mb-16">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg mr-4">
              <Church className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Emmanuel Assembly
              </h2>
              <p className="text-sm text-gray-600">Church Management System</p>
            </div>
          </div>

          {/* Input Label */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">
              Enter your phone number or membership ID
            </label>
          </div>

          {/* Phone Number Input */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Phone className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="phone-or-id"
                type="text"
                placeholder="Enter your phone number or EA-XXXX-YYYY"
                value={phoneOrId}
                onChange={(e) => setPhoneOrId(e.target.value)}
                className="pl-12 h-14 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Success Message Box */}
          <div className="mb-8">
            <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-white text-sm font-medium">Secure Login</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-xs">Privacy</span>
                <span className="text-gray-400 text-xs">Terms</span>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <Button 
            type="button"
            onClick={handleDirectLogin}
            className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            disabled={loading || !phoneOrId.trim()}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Signing In...
              </div>
            ) : (
              'CONTINUE'
            )}
          </Button>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact your church administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}