'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { KioskForm } from '@/components/kiosk-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Monitor, 
  ArrowLeft, 
  CheckCircle, 
  Users,
  QrCode,
  Calendar
} from 'lucide-react'
import { Member, Dependant } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

export default function KioskPage() {
  const [recentCheckIns, setRecentCheckIns] = useState<Array<{
    member: Member
    dependants?: Dependant[]
    timestamp: string
  }>>([])
  
  const router = useRouter()
  const { toast } = useToast()

  const handleCheckInSuccess = (member: Member, dependants?: Dependant[]) => {
    // Add to recent check-ins
    setRecentCheckIns(prev => [{
      member,
      dependants,
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 4)]) // Keep only last 5

    // Could also show a success animation or sound here
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">
                Kiosk Check-in
              </h1>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/scanner')}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Scanner
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Attendance
              </Button>
            </div>
          </div>
          <p className="text-gray-600">
            Search for members and check them in for today's service.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Kiosk Form */}
          <div className="lg:col-span-2">
            <KioskForm onCheckInSuccess={handleCheckInSuccess} />
          </div>

          {/* Recent Check-ins */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Recent Check-ins</span>
                </CardTitle>
                <CardDescription>
                  Today's successful check-ins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentCheckIns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No check-ins yet today</p>
                    <p className="text-sm">Check-ins will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCheckIns.map((checkIn, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {checkIn.member.user?.full_name || 'Unknown Member'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(checkIn.timestamp).toLocaleTimeString()}
                          </p>
                          {checkIn.dependants && checkIn.dependants.length > 0 && (
                            <p className="text-xs text-gray-500">
                              +{checkIn.dependants.length} family member(s)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Today's Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Check-ins:</span>
                    <span className="font-medium">{recentCheckIns.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Family Members:</span>
                    <span className="font-medium">
                      {recentCheckIns.reduce((sum, checkIn) => 
                        sum + (checkIn.dependants?.length || 0), 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Service:</span>
                    <span className="font-medium">Sunday Service</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Kiosk Mode Instructions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">For Members:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Approach the kiosk and wait for assistance</li>
                    <li>• Provide your membership ID, phone number, or name</li>
                    <li>• Select any family members to check in together</li>
                    <li>• Confirm your details and complete check-in</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">For Administrators:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use the search function to find members quickly</li>
                    <li>• Verify member identity before check-in</li>
                    <li>• Include family members when requested</li>
                    <li>• Monitor recent check-ins for accuracy</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
