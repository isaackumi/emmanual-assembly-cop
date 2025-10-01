'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error-display'
import { 
  Users, 
  UserCheck, 
  UserX, 
  MessageSquare,
  BarChart3,
  Calendar,
  Clock,
  Filter,
  Search,
  Send,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  PieChart,
  LineChart
} from 'lucide-react'
import { enhancedAttendanceService, AttendanceStats } from '@/lib/services/enhanced-attendance-service'
import { AttendanceActivity } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'

interface Member {
  id: string
  full_name: string
  membership_id: string
  phone?: string
  email?: string
  gender?: 'male' | 'female'
  dob?: string
  departments?: string[]
  is_present?: boolean
  is_absentee?: boolean
}

interface AbsenteeMember {
  id: string
  member_id: string
  full_name: string
  membership_id: string
  phone?: string
  service_date: string
  service_type: string
  reason?: string
  follow_up_required: boolean
  follow_up_completed: boolean
  sms_sent: boolean
  created_at: string
}

export default function ComprehensiveAttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [absentees, setAbsentees] = useState<AbsenteeMember[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<AttendanceActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [serviceType, setServiceType] = useState('sunday_service')
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Selection
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedAbsentees, setSelectedAbsentees] = useState<string[]>([])
  
  // Actions
  const [sendingSMS, setSendingSMS] = useState(false)
  const [recordingAttendance, setRecordingAttendance] = useState(false)
  
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
      fetchData()
    }
  }, [user, serviceDate, serviceType])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch members with department information
      const { data: membersData, error: membersError } = await createClient()
        .from('members')
        .select(`
          id,
          dob,
          gender,
          user:app_users(id, full_name, membership_id, phone, email),
          department_memberships:department_memberships(
            department:departments(name)
          )
        `)
        .eq('status', 'active')

      if (membersError) throw membersError

      // Transform members data
      const transformedMembers = membersData?.map(member => {
        const user = member.user?.[0] || member.user
        const departments = member.department_memberships?.map((dm: any) => dm.department?.name).filter(Boolean) || []
        
        return {
          id: member.id,
          full_name: user?.full_name || '',
          membership_id: user?.membership_id || '',
          phone: user?.phone,
          email: user?.email,
          gender: member.gender,
          dob: member.dob,
          departments
        }
      }) || []

      setMembers(transformedMembers)

      // Fetch attendance stats
      const dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
      
      const statsData = await enhancedAttendanceService.getAttendanceStats(dateRange)
      setStats(statsData)

      // Fetch recent activity
      const activityData = await enhancedAttendanceService.getRecentActivity(10)
      setRecentActivity(activityData)

      // Fetch absentees for today
      await fetchAbsentees()
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAbsentees = async () => {
    try {
      const { data, error } = await createClient()
        .from('absentee_records')
        .select(`
          id,
          member_id,
          service_date,
          service_type,
          reason,
          follow_up_required,
          follow_up_completed,
          sms_sent,
          created_at,
          member:members(
            user:app_users(full_name, membership_id, phone)
          )
        `)
        .eq('service_date', serviceDate)
        .eq('service_type', serviceTypes.find(s => s.value === serviceType)?.label || 'Sunday Service')

      if (error) throw error

      const transformedAbsentees = data?.map((record: any) => {
        // Handle the user data structure properly
        let user: any = null
        if (record.member?.user) {
          if (Array.isArray(record.member.user)) {
            user = record.member.user[0]
          } else {
            user = record.member.user
          }
        }
        
        return {
          id: record.id,
          member_id: record.member_id,
          full_name: user?.full_name || '',
          membership_id: user?.membership_id || '',
          phone: user?.phone,
          service_date: record.service_date,
          service_type: record.service_type,
          reason: record.reason,
          follow_up_required: record.follow_up_required,
          follow_up_completed: record.follow_up_completed,
          sms_sent: record.sms_sent,
          created_at: record.created_at
        }
      }) || []

      setAbsentees(transformedAbsentees)
    } catch (err) {
      console.error('Error fetching absentees:', err)
    }
  }

  const handleMemberSelect = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSelectAllMembers = () => {
    const filtered = getFilteredMembers()
    if (selectedMembers.length === filtered.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(filtered.map(m => m.id))
    }
  }

  const handleAbsenteeSelect = (absenteeId: string) => {
    setSelectedAbsentees(prev => 
      prev.includes(absenteeId) 
        ? prev.filter(id => id !== absenteeId)
        : [...prev, absenteeId]
    )
  }

  const getFilteredMembers = (): Member[] => {
    return members.filter(member => {
      const matchesSearch = searchTerm === '' || 
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.membership_id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDepartment = departmentFilter === 'all' || 
        member.departments?.includes(departmentFilter)

      const matchesGender = genderFilter === 'all' || member.gender === genderFilter

      const matchesAge = ageFilter === 'all' || 
        (ageFilter === 'adult' && getAgeCategory(member.dob) === 'adult') ||
        (ageFilter === 'child' && getAgeCategory(member.dob) === 'child')

      return matchesSearch && matchesDepartment && matchesGender && matchesAge
    })
  }

  const getAgeCategory = (dob?: string): 'adult' | 'child' => {
    if (!dob) return 'adult'
    const age = new Date().getFullYear() - new Date(dob).getFullYear()
    return age < 18 ? 'child' : 'adult'
  }

  const handleBulkAttendance = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select members to record attendance for.",
        variant: "destructive"
      })
      return
    }

    try {
      setRecordingAttendance(true)

      const result = await enhancedAttendanceService.recordBulkAttendance({
        member_ids: selectedMembers,
        service_date: serviceDate,
        service_type: serviceTypes.find(s => s.value === serviceType)?.label || 'Sunday Service',
        created_by: user?.id || 'admin',
        method: 'admin'
      })

      toast({
        title: "Attendance Recorded",
        description: `${result.successful} members checked in successfully. ${result.duplicates} duplicates prevented.`,
        variant: "default"
      })

      setSelectedMembers([])
      fetchData()
    } catch (err) {
      console.error('Error recording bulk attendance:', err)
      toast({
        title: "Error",
        description: "Failed to record attendance. Please try again.",
        variant: "destructive"
      })
    } finally {
      setRecordingAttendance(false)
    }
  }

  const handleMarkAbsentee = async (memberId: string) => {
    try {
      await enhancedAttendanceService.markAbsentee({
        member_id: memberId,
        service_date: serviceDate,
        service_type: serviceTypes.find(s => s.value === serviceType)?.label || 'Sunday Service',
        follow_up_required: true,
        created_by: user?.id || 'admin'
      })

      toast({
        title: "Absentee Marked",
        description: "Member marked as absent and follow-up scheduled.",
        variant: "default"
      })

      fetchAbsentees()
    } catch (err) {
      console.error('Error marking absentee:', err)
      toast({
        title: "Error",
        description: "Failed to mark absentee. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSendAbsenteeSMS = async () => {
    if (selectedAbsentees.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select absentees to send SMS to.",
        variant: "destructive"
      })
      return
    }

    try {
      setSendingSMS(true)
      let successCount = 0

      for (const absenteeId of selectedAbsentees) {
        const success = await enhancedAttendanceService.sendAbsenteeSMS(absenteeId)
        if (success) successCount++
      }

      toast({
        title: "SMS Sent",
        description: `SMS messages sent to ${successCount} absentees.`,
        variant: "default"
      })

      setSelectedAbsentees([])
      fetchAbsentees()
    } catch (err) {
      console.error('Error sending SMS:', err)
      toast({
        title: "Error",
        description: "Failed to send SMS messages. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSendingSMS(false)
    }
  }

  const filteredMembers = getFilteredMembers()
  const uniqueDepartments = Array.from(new Set(members.flatMap(m => m.departments || [])))

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
            Comprehensive Attendance Management
          </h1>
          <p className="text-gray-600">Advanced attendance tracking with departments, duplicate prevention, and absentee management</p>
        </div>

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={fetchData}
            variant="page"
          />
        )}

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Attendance</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total_attendance}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Male/Female</p>
                    <p className="text-lg font-bold text-gray-900">
                      {stats.male_attendance}/{stats.female_attendance}
                    </p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Adults/Children</p>
                    <p className="text-lg font-bold text-gray-900">
                      {stats.adult_attendance}/{stats.children_attendance}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absentees</p>
                    <p className="text-2xl font-bold text-red-600">{absentees.length}</p>
                  </div>
                  <UserX className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="absentees">Absentees</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <Label>Service Date</Label>
                    <Input
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>Service Type</Label>
                    <Select value={serviceType} onValueChange={setServiceType}>
                      <SelectTrigger>
                        <SelectValue />
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

                  <div>
                    <Label>Department</Label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {uniqueDepartments.map(dept => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Gender</Label>
                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Age Group</Label>
                    <Select value={ageFilter} onValueChange={setAgeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="adult">Adults</SelectItem>
                        <SelectItem value="child">Children</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                      onCheckedChange={handleSelectAllMembers}
                    />
                    <span className="text-sm text-gray-600">
                      {selectedMembers.length} of {filteredMembers.length} members selected
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleBulkAttendance}
                      disabled={selectedMembers.length === 0 || recordingAttendance}
                    >
                      {recordingAttendance ? (
                        <>
                          <LoadingSpinner className="h-4 w-4 mr-2" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Record Attendance ({selectedMembers.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Members ({filteredMembers.length})</CardTitle>
                <CardDescription>Select members to record attendance or mark as absent</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No members found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                          selectedMembers.includes(member.id) ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedMembers.includes(member.id)}
                              onCheckedChange={() => handleMemberSelect(member.id)}
                            />
                            
                            <div>
                              <h4 className="font-medium text-gray-900">{member.full_name}</h4>
                              <p className="text-sm text-gray-500">{member.membership_id}</p>
                              {member.departments && member.departments.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {member.departments.map(dept => (
                                    <Badge key={dept} variant="outline" className="text-xs">
                                      {dept}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Badge variant={member.gender === 'male' ? 'default' : 'secondary'}>
                                  {member.gender || 'Unknown'}
                                </Badge>
                                <Badge variant={getAgeCategory(member.dob) === 'adult' ? 'default' : 'secondary'}>
                                  {getAgeCategory(member.dob)}
                                </Badge>
                              </div>
                              {member.phone && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {member.phone}
                                </p>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAbsentee(member.id)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Mark Absent
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Absentees Tab */}
          <TabsContent value="absentees" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Absentees ({absentees.length})</CardTitle>
                    <CardDescription>Members who were absent and need follow-up</CardDescription>
                  </div>
                  <Button 
                    onClick={handleSendAbsenteeSMS}
                    disabled={selectedAbsentees.length === 0 || sendingSMS}
                  >
                    {sendingSMS ? (
                      <>
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send SMS ({selectedAbsentees.length})
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {absentees.length === 0 ? (
                  <div className="text-center py-8">
                    <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No absentees for this service</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {absentees.map((absentee) => (
                      <div key={absentee.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedAbsentees.includes(absentee.id)}
                              onCheckedChange={() => handleAbsenteeSelect(absentee.id)}
                            />
                            
                            <div>
                              <h4 className="font-medium text-gray-900">{absentee.full_name}</h4>
                              <p className="text-sm text-gray-500">{absentee.membership_id}</p>
                              {absentee.reason && (
                                <p className="text-sm text-gray-600 mt-1">Reason: {absentee.reason}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Badge variant={absentee.follow_up_completed ? 'default' : 'secondary'}>
                                  {absentee.follow_up_completed ? 'Followed Up' : 'Pending'}
                                </Badge>
                                <Badge variant={absentee.sms_sent ? 'default' : 'secondary'}>
                                  {absentee.sms_sent ? 'SMS Sent' : 'No SMS'}
                                </Badge>
                              </div>
                              {absentee.phone && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {absentee.phone}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {absentee.phone && !absentee.sms_sent && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => enhancedAttendanceService.sendAbsenteeSMS(absentee.id)}
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Send SMS
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            {stats?.department_stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Department Attendance</CardTitle>
                    <CardDescription>Attendance by department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(stats.department_stats).map(([dept, deptStats]) => {
                        const percentage = deptStats.total > 0 ? (deptStats.present / deptStats.total) * 100 : 0
                        return (
                          <div key={dept} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{dept}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{deptStats.present}/{deptStats.total}</span>
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-500 w-12 text-right">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Trends</CardTitle>
                    <CardDescription>Recent attendance patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Duplicate Prevention</span>
                        <span className="text-sm font-bold text-green-600">
                          {stats.duplicate_prevention.blocked_duplicates} blocked
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Sessions Monitored</span>
                        <span className="text-sm font-bold text-blue-600">
                          {stats.duplicate_prevention.sessions_checked}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest attendance activities and changes</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {activity.type === 'check_in' && <UserCheck className="h-5 w-5 text-blue-600" />}
                          {activity.type === 'bulk_attendance' && <Users className="h-5 w-5 text-green-600" />}
                          {activity.type === 'absentee_marked' && <UserX className="h-5 w-5 text-red-600" />}
                          {activity.type === 'follow_up' && <MessageSquare className="h-5 w-5 text-purple-600" />}
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.description}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{activity.service_date}</span>
                            <span>•</span>
                            <span>{activity.service_type}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
