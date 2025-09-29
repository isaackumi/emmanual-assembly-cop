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
  CheckSquare, 
  ArrowLeft, 
  Search,
  User,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatMembershipIdForDisplay, formatDateTime } from '@/lib/utils'

interface Member {
  id: string
  full_name: string
  membership_id: string
  phone?: string
  email?: string
  dependants?: Array<{
    id: string
    relationship: string
  }>
}

interface CheckInResult {
  member: Member
  dependants: Array<{
    id: string
    relationship: string
  }>
  service_type: string
  timestamp: string
}

export default function ManualCheckInPage() {
  const { user, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedDependants, setSelectedDependants] = useState<string[]>([])
  const [serviceType, setServiceType] = useState('sunday_service')
  const [loading, setLoading] = useState(false)
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const serviceTypes = [
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'midweek_service', label: 'Midweek Service' },
    { value: 'prayer_meeting', label: 'Prayer Meeting' },
    { value: 'youth_service', label: 'Youth Service' },
    { value: 'children_service', label: 'Children Service' },
    { value: 'special_event', label: 'Special Event' }
  ]

  useEffect(() => {
    if (user) {
      fetchMembers()
    }
  }, [user])

  useEffect(() => {
    if (searchTerm) {
      const filtered = members.filter(member =>
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.membership_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.phone && member.phone.includes(searchTerm))
      )
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(members)
    }
  }, [searchTerm, members])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First get all members from the members table
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          user:app_users(
            id,
            full_name,
            membership_id,
            phone,
            email
          ),
          dependants(id, relationship)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (membersError) throw membersError

      // Transform the data to match our interface
      const transformedMembers = (membersData || [])
        .filter(member => member && member.user && Array.isArray(member.user) && member.user.length > 0)
        .map(member => ({
          id: member.user[0]?.id,
          full_name: member.user[0]?.full_name,
          membership_id: member.user[0]?.membership_id,
          phone: member.user[0]?.phone,
          email: member.user[0]?.email,
          dependants: member.dependants || []
        }))

      setMembers(transformedMembers)
      setFilteredMembers(transformedMembers)
    } catch (err) {
      console.error('Error fetching members:', err)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member)
    setSelectedDependants([])
    setCheckInResult(null)
  }

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
      const { error: memberError } = await supabase
        .from('attendance')
        .insert({
          member_id: selectedMember.id,
          service_date: serviceDate,
          service_type: serviceLabel,
          check_in_time: checkInTime,
          status: 'present',
          checked_in_by: user?.id
        })

      if (memberError) throw memberError

      // Record attendance for selected dependants
      const selectedDependantObjects = selectedMember.dependants?.filter(d => 
        selectedDependants.includes(d.id)
      ) || []

      if (selectedDependantObjects.length > 0) {
        const dependantAttendance = selectedDependantObjects.map(dependant => ({
          member_id: dependant.id,
          service_date: serviceDate,
          service_type: serviceLabel,
          check_in_time: checkInTime,
          status: 'present',
          checked_in_by: user?.id
        }))

        const { error: dependantsError } = await supabase
          .from('attendance')
          .insert(dependantAttendance)

        if (dependantsError) throw dependantsError
      }

      setCheckInResult({
        member: selectedMember,
        dependants: selectedDependantObjects,
        service_type: serviceLabel,
        timestamp: checkInTime
      })

      toast({
        title: "Check-in Successful",
        description: `${selectedMember.full_name} has been checked in successfully.`,
        variant: "default"
      })
    } catch (err) {
      console.error('Error checking in member:', err)
      setError('Failed to check in member. Please try again.')
      toast({
        title: "Check-in Failed",
        description: "There was an error checking in the member. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewCheckIn = () => {
    setSelectedMember(null)
    setSelectedDependants([])
    setCheckInResult(null)
    setSearchTerm('')
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
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                <CheckSquare className="h-8 w-8 mr-3 text-blue-600" />
                Manual Check-in
              </h1>
              <p className="text-gray-600">Manually check in members for service attendance</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Service Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Service Type</CardTitle>
              <CardDescription>Select the type of service for attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onRetry={fetchMembers} />
          </div>
        )}

        {checkInResult ? (
          /* Success Result */
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="h-5 w-5 mr-2" />
                Check-in Successful
              </CardTitle>
              <CardDescription className="text-green-600">
                Member has been successfully checked in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {checkInResult.member.full_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatMembershipIdForDisplay(checkInResult.member.membership_id)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Service:</span>
                    <span className="ml-2 font-medium">{checkInResult.service_type}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium">
                      {formatDateTime(checkInResult.timestamp)}
                    </span>
                  </div>
                </div>

                {checkInResult.dependants.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center mb-2">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Dependants:</span>
                    </div>
                    <div className="space-y-1">
                      {checkInResult.dependants.map((dependant) => (
                        <div key={dependant.id} className="text-sm text-gray-600">
                          • Dependant ({dependant.relationship})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleNewCheckIn}
                className="w-full"
                variant="outline"
              >
                Check In Another Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Member Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2 text-blue-600" />
                  Search Members
                </CardTitle>
                <CardDescription>
                  Search for members by name, membership ID, or phone number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Enter name, membership ID, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredMembers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No members found</p>
                        {searchTerm && (
                          <p className="text-sm">Try adjusting your search terms</p>
                        )}
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedMember?.id === member.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => handleMemberSelect(member)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {member.full_name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {formatMembershipIdForDisplay(member.membership_id)}
                              </p>
                              {member.phone && (
                                <p className="text-sm text-gray-500">{member.phone}</p>
                              )}
                            </div>
                            {member.dependants && member.dependants.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {member.dependants.length} dependant(s)
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check-in Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckSquare className="h-5 w-5 mr-2 text-blue-600" />
                  Check-in Details
                </CardTitle>
                <CardDescription>
                  Select dependants and confirm attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedMember ? (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Selected Member
                      </h3>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedMember.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {formatMembershipIdForDisplay(selectedMember.membership_id)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedMember.dependants && selectedMember.dependants.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Include Dependants</Label>
                        <div className="mt-2 space-y-2">
                          {selectedMember.dependants.map((dependant) => (
                            <div key={dependant.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={dependant.id}
                                checked={selectedDependants.includes(dependant.id)}
                                onCheckedChange={() => handleDependantToggle(dependant.id)}
                              />
                              <Label
                                htmlFor={dependant.id}
                                className="text-sm font-normal cursor-pointer"
                              >
                                Dependant ({dependant.relationship})
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Check-in Summary</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Service:</strong> {serviceTypes.find(s => s.value === serviceType)?.label}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
                        <p><strong>Attendees:</strong> 1 member + {selectedDependants.length} dependant(s)</p>
                      </div>
                    </div>

                    <Button 
                      onClick={handleCheckIn}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Check-in
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a member to check in</p>
                    <p className="text-sm">Choose a member from the search results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to other attendance features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/scanner')}
                className="h-20 flex-col space-y-2"
              >
                <User className="h-6 w-6" />
                <span>QR Scanner</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance/kiosk')}
                className="h-20 flex-col space-y-2"
              >
                <Users className="h-6 w-6" />
                <span>Kiosk Mode</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance')}
                className="h-20 flex-col space-y-2"
              >
                <Calendar className="h-6 w-6" />
                <span>View Attendance</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
                className="h-20 flex-col space-y-2"
              >
                <ArrowLeft className="h-6 w-6" />
                <span>Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
