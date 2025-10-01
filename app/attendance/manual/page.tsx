'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { 
  Users, 
  Search, 
  UserCheck, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useMembers } from '@/lib/hooks/use-data'
import { dataService } from '@/lib/services/data-service'
import { useToast } from '@/hooks/use-toast'
import { formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'
import { Member, Dependant } from '@/lib/types'

interface MemberWithDependants extends Member {
  dependants?: Dependant[]
}

interface CheckInResult {
  member: MemberWithDependants
  dependants: Dependant[]
  service_type: string
  timestamp: string
}

export default function ManualCheckInPage() {
  const { user, loading: authLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberWithDependants | null>(null)
  const [selectedDependants, setSelectedDependants] = useState<string[]>([])
  const [serviceType, setServiceType] = useState('sunday_service')
  const [loading, setLoading] = useState(false)
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const { data: members, total, hasMore, error: membersError, loading: membersLoading } = useMembers(1, 50, searchTerm)

  const serviceTypes = [
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'midweek_service', label: 'Midweek Service' },
    { value: 'prayer_meeting', label: 'Prayer Meeting' },
    { value: 'youth_service', label: 'Youth Service' },
    { value: 'children_service', label: 'Children Service' },
    { value: 'special_event', label: 'Special Event' }
  ]

  const handleDependantToggle = (dependantId: string) => {
    setSelectedDependants(prev => 
      prev.includes(dependantId) 
        ? prev.filter(id => id !== dependantId)
        : [...prev, dependantId]
    )
  }

  const handleCheckIn = async () => {
    if (!selectedMember) return

    try {
      setLoading(true)
      setError(null)

      const serviceLabel = serviceTypes.find(s => s.value === serviceType)?.label || 'Sunday Service'
      const checkInTime = new Date().toISOString()
      const serviceDate = new Date().toISOString().split('T')[0]

      // Record attendance for main member
      const { error: memberError } = await dataService.recordAttendance({
        member_id: selectedMember.id,
        service_date: serviceDate,
        service_type: serviceLabel,
        check_in_time: checkInTime,
        status: 'present',
        checked_in_by: user?.id || ''
      })

      if (memberError) throw new Error(memberError)

      // Record attendance for selected dependants
      const selectedDependantObjects = selectedMember.dependants?.filter(d => 
        selectedDependants.includes(d.id)
      ) || []

      if (selectedDependantObjects.length > 0) {
        for (const dependant of selectedDependantObjects) {
          const { error: dependantError } = await dataService.recordAttendance({
            member_id: dependant.id,
            service_date: serviceDate,
            service_type: serviceLabel,
            check_in_time: checkInTime,
            status: 'present',
            checked_in_by: user?.id || ''
          })

          if (dependantError) throw new Error(dependantError)
        }
      }

      setCheckInResult({
        member: selectedMember,
        dependants: selectedDependantObjects,
        service_type: serviceLabel,
        timestamp: checkInTime
      })

      toast({
        title: "Check-in Successful",
        description: `${selectedMember.user?.full_name || 'Member'} has been checked in successfully.`,
        variant: "default"
      })
    } catch (err) {
      console.error('Error checking in member:', err)
      setError(err instanceof Error ? err.message : 'Failed to check in member')
      toast({
        title: "Check-in Failed",
        description: "There was an error processing the check-in.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedMember(null)
    setSelectedDependants([])
    setCheckInResult(null)
    setError(null)
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access manual check-in.</p>
            <Button onClick={() => router.push('/auth')}>
              Go to Login
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (checkInResult) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Check-in Successful!</CardTitle>
              <CardDescription className="text-green-700">
                {checkInResult.member.user?.full_name || 'Member'} has been checked in successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Member:</span>
                  <span>{checkInResult.member.user?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Service:</span>
                  <span>{checkInResult.service_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Time:</span>
                  <span>{formatDateTime(checkInResult.timestamp)}</span>
                </div>
                {checkInResult.dependants.length > 0 && (
                  <div>
                    <span className="font-medium">Dependants:</span>
                    <ul className="mt-1 space-y-1">
                      {checkInResult.dependants.map(dependant => (
                        <li key={dependant.id} className="text-sm text-gray-600">
                          {dependant.first_name} {dependant.last_name} ({dependant.relationship})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={resetForm} className="flex-1">
                  Check In Another Member
                </Button>
                <Button variant="outline" onClick={() => router.push('/attendance')}>
                  View Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Manual Check-in</h1>
          <p className="text-gray-600 mt-2">
            Manually check in members and their dependants for church services
          </p>
        </div>

        {/* Service Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
            <CardDescription>
              Select the service type for this check-in session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="service-type">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(service => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Member Search */}
        <Card>
          <CardHeader>
            <CardTitle>Find Member</CardTitle>
            <CardDescription>
              Search for a member to check in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or membership ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {membersLoading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            )}

            {membersError && (
              <ErrorDisplay 
                title="Failed to load members"
                error={membersError}
              />
            )}

            {!membersLoading && !membersError && members.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                No members found matching "{searchTerm}"
              </div>
            )}

            {!membersLoading && !membersError && members.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {members.map(member => (
                  <div
                    key={member.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMember?.id === member.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMember(member)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{member.user?.full_name || 'Unknown'}</div>
                        <div className="text-sm text-gray-600">
                          ID: {formatMembershipIdForDisplay(member.user?.membership_id || '')}
                        </div>
                        {member.user?.phone && (
                          <div className="text-sm text-gray-500">{member.user.phone}</div>
                        )}
                      </div>
                      {selectedMember?.id === member.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dependants Selection */}
        {selectedMember && selectedMember.dependants && selectedMember.dependants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Dependants</CardTitle>
              <CardDescription>
                Choose which dependants to check in with {selectedMember.user?.full_name || 'this member'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedMember.dependants.map(dependant => (
                  <div key={dependant.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={dependant.id}
                      checked={selectedDependants.includes(dependant.id)}
                      onCheckedChange={() => handleDependantToggle(dependant.id)}
                    />
                    <Label htmlFor={dependant.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">
                        {dependant.first_name} {dependant.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {dependant.relationship}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Check-in Summary */}
        {selectedMember && (
          <Card>
            <CardHeader>
              <CardTitle>Check-in Summary</CardTitle>
              <CardDescription>
                Review the details before confirming check-in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Member:</span>
                  <span>{selectedMember.user?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Service:</span>
                  <span>{serviceTypes.find(s => s.value === serviceType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Time:</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                {selectedDependants.length > 0 && (
                  <div>
                    <span className="font-medium">Dependants:</span>
                    <ul className="mt-1 space-y-1">
                      {selectedMember.dependants
                        ?.filter(d => selectedDependants.includes(d.id))
                        .map(dependant => (
                          <li key={dependant.id} className="text-sm text-gray-600">
                            {dependant.first_name} {dependant.last_name} ({dependant.relationship})
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleCheckIn} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Confirm Check-in
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}