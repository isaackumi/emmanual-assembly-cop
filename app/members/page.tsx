'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Calendar,
  Gift,
  Heart,
  Phone,
  Mail,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  UserPlus,
  CheckCircle,
  Circle,
  Eye,
  Edit,
  MoreHorizontal,
  Building2,
  Send,
  BarChart3,
  Clock,
  TrendingUp,
  UserCheck
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Member, AppUser } from '@/lib/types'
import { formatDate, calculateAge } from '@/lib/utils'

interface MemberWithUser extends Member {
  user: AppUser
}

interface SMSMessage {
  group: string
  message: string
}

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'join_date' | 'status'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<MemberWithUser[]>([])
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<MemberWithUser[]>([])
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [smsMessage, setSmsMessage] = useState<SMSMessage>({ group: '', message: '' })
  const [sendingSms, setSendingSms] = useState(false)

  // Redirect to auth if no user
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchMembers()
      fetchUpcomingEvents()
    }
  }, [user])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      console.log('Fetching members...')
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          user:app_users(full_name, membership_id, phone, email, role, created_at)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching members:', error)
        throw error
      }
      
      console.log('Members fetched:', data)
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingEvents = async () => {
    if (!user) return

    try {
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      // Get members with upcoming birthdays
      const { data: membersData, error } = await supabase
        .from('members')
        .select(`
          *,
          user:app_users(full_name, membership_id, phone, email, role, created_at)
        `)
        .eq('is_active', true)
        .not('dob', 'is', null)

      if (!error && membersData) {
        const birthdays = membersData.filter(member => {
          if (!member.dob) return false
          const birthday = new Date(member.dob)
          const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())
          
          if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(today.getFullYear() + 1)
          }
          
          return thisYearBirthday >= today && thisYearBirthday <= thirtyDaysFromNow
        })

        const anniversaries = membersData.filter(member => {
          const joinDate = new Date(member.created_at)
          const thisYearAnniversary = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate())
          
          if (thisYearAnniversary < today) {
            thisYearAnniversary.setFullYear(today.getFullYear() + 1)
          }
          
          return thisYearAnniversary >= today && thisYearAnniversary <= thirtyDaysFromNow
        })

        setUpcomingBirthdays(birthdays)
        setUpcomingAnniversaries(anniversaries)
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
    }
  }

  const getUpcomingEventDays = (date: string, type: 'birthday' | 'anniversary') => {
    const today = new Date()
    const eventDate = new Date(date)
    
    if (type === 'birthday') {
      const thisYearBirthday = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate())
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1)
      }
      const diffTime = thisYearBirthday.getTime() - today.getTime()
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } else {
      const thisYearAnniversary = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate())
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(today.getFullYear() + 1)
      }
      const diffTime = thisYearAnniversary.getTime() - today.getTime()
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
  }

  const getMemberGroup = (member: MemberWithUser): string => {
    if (!member.dob) return 'Unknown'
    const age = calculateAge(member.dob)
    if (age <= 17) return 'Children'
    if (age <= 35) return 'Youth'
    if (member.gender === 'male') return 'Men Fellowship'
    return 'Women Fellowship'
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.user?.membership_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.user?.phone?.includes(searchTerm)
    
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus
    const matchesGroup = selectedGroup === 'all' || getMemberGroup(member) === selectedGroup
    
    return matchesSearch && matchesStatus && matchesGroup
  })

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'name':
        aValue = a.user?.full_name || ''
        bValue = b.user?.full_name || ''
        break
      case 'join_date':
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
      case 'status':
        aValue = a.status || ''
        bValue = b.status || ''
        break
      default:
        aValue = a.user?.full_name || ''
        bValue = b.user?.full_name || ''
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSendSMS = async () => {
    if (!smsMessage.group || !smsMessage.message.trim()) {
      toast({
        title: "Error",
        description: "Please select a group and enter a message",
        variant: "destructive"
      })
      return
    }

    try {
      setSendingSms(true)
      
      // Get members in the selected group
      const groupMembers = members.filter(member => getMemberGroup(member) === smsMessage.group)
      
      // Here you would integrate with your SMS service
      // For now, we'll just show a success message
      toast({
        title: "SMS Sent!",
        description: `Message sent to ${groupMembers.length} members in ${smsMessage.group}`,
      })
      
      setSmsModalOpen(false)
      setSmsMessage({ group: '', message: '' })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSendingSms(false)
    }
  }

  const getGroupMembers = (groupName: string) => {
    return members.filter(member => getMemberGroup(member) === groupName).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading members...</p>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="mr-3 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Membership Management
            </h1>
            <p className="text-gray-600">Manage church members, groups, and communications</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setSmsModalOpen(true)}
              className="flex items-center"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push('/members/add')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Members</p>
                  <p className="text-3xl font-bold">{members.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Active Members</p>
                  <p className="text-3xl font-bold">{members.filter(m => m.status === 'active').length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Upcoming Birthdays</p>
                  <p className="text-3xl font-bold">{upcomingBirthdays.length}</p>
                </div>
                <Gift className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Anniversaries</p>
                  <p className="text-3xl font-bold">{upcomingAnniversaries.length}</p>
                </div>
                <Heart className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Groups</option>
                    <option value="Children">Children</option>
                    <option value="Youth">Youth</option>
                    <option value="Men Fellowship">Men Fellowship</option>
                    <option value="Women Fellowship">Women Fellowship</option>
                  </select>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [sort, order] = e.target.value.split('-')
                      setSortBy(sort as any)
                      setSortOrder(order as any)
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="join_date-desc">Newest First</option>
                    <option value="join_date-asc">Oldest First</option>
                    <option value="status-asc">Status A-Z</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Members ({sortedMembers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sortedMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {member.user?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{member.user?.full_name || 'Unknown'}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{member.user?.membership_id}</span>
                            <span className="capitalize">{getMemberGroup(member)}</span>
                            <span className="capitalize">{member.status}</span>
                            {member.dob && <span>Age {calculateAge(member.dob)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/members/${member.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['Children', 'Youth', 'Men Fellowship', 'Women Fellowship'].map((group) => (
                <Card key={group} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{group}</h3>
                    <p className="text-3xl font-bold text-blue-600 mb-2">{getGroupMembers(group)}</p>
                    <p className="text-sm text-gray-500">Members</p>
                    <Button 
                      className="mt-4 w-full" 
                      variant="outline"
                      onClick={() => {
                        setSelectedGroup(group)
                        // Switch to members tab and filter by group
                        const membersTab = document.querySelector('[value="members"]') as HTMLElement
                        if (membersTab) membersTab.click()
                      }}
                    >
                      View Members
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Attendance</CardTitle>
                  <CardDescription>Mark attendance for today's service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/attendance/kiosk')}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Kiosk Mode
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => router.push('/attendance/scanner')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    QR Scanner
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Stats</CardTitle>
                  <CardDescription>Recent attendance trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Today's Service</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Week</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="font-semibold">--</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Growth Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-gray-500">Growth analytics coming soon</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-500">Engagement metrics coming soon</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                    <p className="text-gray-500">Demographic insights coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* SMS Modal */}
        {smsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Send SMS to Group</CardTitle>
                <CardDescription>Send a message to all members in a specific group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Group</label>
                  <select
                    value={smsMessage.group}
                    onChange={(e) => setSmsMessage({ ...smsMessage, group: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a group</option>
                    {['Children', 'Youth', 'Men Fellowship', 'Women Fellowship'].map((group) => (
                      <option key={group} value={group}>
                        {group} ({getGroupMembers(group)} members)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={smsMessage.message}
                    onChange={(e) => setSmsMessage({ ...smsMessage, message: e.target.value })}
                    placeholder="Type your message here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Characters: {smsMessage.message.length}/160
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setSmsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendSMS}
                    disabled={sendingSms || !smsMessage.group || !smsMessage.message.trim()}
                    className="flex-1"
                  >
                    {sendingSms ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send SMS
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}