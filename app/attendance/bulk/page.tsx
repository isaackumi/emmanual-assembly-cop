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
  ArrowLeft, 
  Search,
  CheckCircle,
  Calendar,
  Clock,
  User,
  UserCheck,
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

interface BulkCheckInResult {
  successful: number
  failed: number
  errors: string[]
  service_type: string
  timestamp: string
}

export default function BulkAttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedDependants, setSelectedDependants] = useState<Map<string, string[]>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceType, setServiceType] = useState('sunday_service')
  const [loading, setLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkCheckInResult | null>(null)
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
      
      // Get all members from the members table
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

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
      // Also remove dependants for this member
      const newDependants = new Map(selectedDependants)
      newDependants.delete(memberId)
      setSelectedDependants(newDependants)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleDependantToggle = (memberId: string, dependantId: string) => {
    const newDependants = new Map(selectedDependants)
    const memberDependants = newDependants.get(memberId) || []
    
    if (memberDependants.includes(dependantId)) {
      const filtered = memberDependants.filter(id => id !== dependantId)
      if (filtered.length === 0) {
        newDependants.delete(memberId)
      } else {
        newDependants.set(memberId, filtered)
      }
    } else {
      newDependants.set(memberId, [...memberDependants, dependantId])
    }
    
    setSelectedDependants(newDependants)
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      // Deselect all
      setSelectedMembers(new Set())
      setSelectedDependants(new Map())
    } else {
      // Select all
      const allMemberIds = new Set(filteredMembers.map(m => m.id))
      setSelectedMembers(allMemberIds)
    }
  }

  const handleBulkCheckIn = async () => {
    if (selectedMembers.size === 0) {
      toast({
        title: "No Members Selected",
        description: "Please select at least one member to check in.",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      setError(null)

      const serviceLabel = serviceTypes.find(s => s.value === serviceType)?.label || 'Sunday Service'
      const checkInTime = new Date().toISOString()
      const serviceDate = new Date().toISOString().split('T')[0]

      const attendanceRecords = []
      const errors: string[] = []
      let successful = 0
      let failed = 0

      // Process main members
      for (const memberId of Array.from(selectedMembers)) {
        try {
          const { error: memberError } = await supabase
            .from('attendance')
            .insert({
              member_id: memberId,
              service_date: serviceDate,
              service_type: serviceLabel,
              check_in_time: checkInTime,
              status: 'present',
              checked_in_by: user?.id
            })

          if (memberError) throw memberError
          successful++

          // Process dependants for this member
          const memberDependants = selectedDependants.get(memberId) || []
          for (const dependantId of memberDependants) {
            try {
              const { error: dependantError } = await supabase
                .from('attendance')
                .insert({
                  member_id: dependantId,
                  service_date: serviceDate,
                  service_type: serviceLabel,
                  check_in_time: checkInTime,
                  status: 'present',
                  checked_in_by: user?.id
                })

              if (dependantError) throw dependantError
              successful++
            } catch (err) {
              failed++
              errors.push(`Dependant check-in failed: ${err}`)
            }
          }
        } catch (err) {
          failed++
          const member = members.find(m => m.id === memberId)
          errors.push(`Member ${member?.full_name || memberId} check-in failed: ${err}`)
        }
      }

      setBulkResult({
        successful,
        failed,
        errors,
        service_type: serviceLabel,
        timestamp: checkInTime
      })

      toast({
        title: "Bulk Check-in Complete",
        description: `${successful} members checked in successfully. ${failed} failed.`,
        variant: successful > 0 ? "default" : "destructive"
      })

      // Clear selections after successful check-in
      if (failed === 0) {
        setSelectedMembers(new Set())
        setSelectedDependants(new Map())
      }
    } catch (err) {
      console.error('Error in bulk check-in:', err)
      setError('Failed to perform bulk check-in. Please try again.')
      toast({
        title: "Bulk Check-in Failed",
        description: "There was an error processing the bulk check-in.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewBulkCheckIn = () => {
    setSelectedMembers(new Set())
    setSelectedDependants(new Map())
    setBulkResult(null)
    setSearchTerm('')
  }

  const getTotalSelectedCount = () => {
    let total = selectedMembers.size
    selectedDependants.forEach(dependantIds => {
      total += dependantIds.length
    })
    return total
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                <Users className="h-8 w-8 mr-3 text-blue-600" />
                Bulk Attendance
              </h1>
              <p className="text-gray-600">Check in multiple members at once for service attendance</p>
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

        {bulkResult ? (
          /* Success Result */
          <Card className={bulkResult.failed === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
            <CardHeader>
              <CardTitle className={`flex items-center ${bulkResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                <CheckCircle className="h-5 w-5 mr-2" />
                Bulk Check-in Complete
              </CardTitle>
              <CardDescription className={bulkResult.failed === 0 ? 'text-green-600' : 'text-yellow-600'}>
                {bulkResult.failed === 0 ? 'All members checked in successfully' : 'Check-in completed with some issues'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Service:</span>
                    <span className="ml-2 font-medium">{bulkResult.service_type}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium">
                      {formatDateTime(bulkResult.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-100 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{bulkResult.successful}</div>
                    <div className="text-sm text-green-600">Successful</div>
                  </div>
                  <div className="text-center p-3 bg-red-100 rounded-lg">
                    <div className="text-2xl font-bold text-red-800">{bulkResult.failed}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>

                {bulkResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {bulkResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleNewBulkCheckIn}
                className="w-full"
                variant="outline"
              >
                Perform Another Bulk Check-in
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Search and Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Search className="h-5 w-5 mr-2 text-blue-600" />
                    Member Selection
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedMembers.size} members selected ({getTotalSelectedCount()} total attendees)
                  </div>
                </CardTitle>
                <CardDescription>
                  Search and select members for bulk attendance check-in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search Members</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search by name, membership ID, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      size="sm"
                    >
                      {selectedMembers.size === filteredMembers.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Members ({filteredMembers.length})</CardTitle>
                <CardDescription>
                  Select members and their dependants for attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No members found</p>
                    {searchTerm && (
                      <p className="text-sm">Try adjusting your search terms</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredMembers.map((member) => {
                      const isSelected = selectedMembers.has(member.id)
                      const memberDependants = selectedDependants.get(member.id) || []
                      
                      return (
                        <div
                          key={member.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleMemberToggle(member.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
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
                                {isSelected && (
                                  <div className="flex items-center text-blue-600">
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    <span className="text-xs font-medium">Selected</span>
                                  </div>
                                )}
                              </div>

                              {/* Dependants */}
                              {isSelected && member.dependants && member.dependants.length > 0 && (
                                <div className="mt-3 pl-6 border-l-2 border-blue-200">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Include Dependants:
                                  </h4>
                                  <div className="space-y-2">
                                    {member.dependants.map((dependant) => (
                                      <div key={dependant.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${member.id}-${dependant.id}`}
                                          checked={memberDependants.includes(dependant.id)}
                                          onCheckedChange={() => handleDependantToggle(member.id, dependant.id)}
                                        />
                                        <Label
                                          htmlFor={`${member.id}-${dependant.id}`}
                                          className="text-sm font-normal cursor-pointer"
                                        >
                                          Dependant ({dependant.relationship})
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {selectedMembers.size > 0 ? (
                      <>
                        <span className="font-medium">{selectedMembers.size}</span> members selected
                        {getTotalSelectedCount() > selectedMembers.size && (
                          <> + <span className="font-medium">{getTotalSelectedCount() - selectedMembers.size}</span> dependants</>
                        )}
                      </>
                    ) : (
                      'No members selected'
                    )}
                  </div>
                  <Button 
                    onClick={handleBulkCheckIn}
                    disabled={loading || selectedMembers.size === 0}
                    className="min-w-32"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check In Selected
                      </>
                    )}
                  </Button>
                </div>
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
                onClick={() => router.push('/attendance/manual')}
                className="h-20 flex-col space-y-2"
              >
                <UserCheck className="h-6 w-6" />
                <span>Manual Check-in</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/attendance')}
                className="h-20 flex-col space-y-2"
              >
                <Calendar className="h-6 w-6" />
                <span>View Attendance</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
