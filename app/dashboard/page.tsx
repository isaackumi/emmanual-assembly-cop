'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  UserPlus,
  CheckSquare,
  Wallet,
  MessageSquare,
  Cake,
  User,
  ChevronRight,
  Bell,
  UserCheck,
  LogOut,
  Settings,
  BarChart3,
  Building2,
  FileText,
  Shield,
  CreditCard,
  PieChart,
  Heart,
  Music,
  BookOpen,
  GraduationCap,
  Users2,
  Baby,
  Home,
  Mail,
  Phone,
  Zap,
  Droplets,
  Brain,
  Camera,
  QrCode,
  Monitor,
  Smartphone,
  Globe,
  Gift,
  Star,
  Target,
  TrendingDown,
  Award,
  Clock,
  MapPin,
  Activity,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AppUser, Member, DashboardStats, Demographics } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [member, setMember] = useState<Member | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [demographics, setDemographics] = useState<Demographics | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const calculateDemographics = (members: Member[]): Demographics => {
    const today = new Date()
    const gender = { male: 0, female: 0 }
    const ageGroups = {
      '0-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    }
    const maritalStatus: { [key: string]: number } = {}
    const groups: { [key: string]: number } = {}

    members.forEach(member => {
      // Gender distribution
      if (member.gender === 'male') gender.male++
      else if (member.gender === 'female') gender.female++

      // Age groups
      if (member.dob) {
        const age = today.getFullYear() - new Date(member.dob).getFullYear()
        if (age <= 17) ageGroups['0-17']++
        else if (age <= 25) ageGroups['18-25']++
        else if (age <= 35) ageGroups['26-35']++
        else if (age <= 50) ageGroups['36-50']++
        else if (age <= 65) ageGroups['51-65']++
        else ageGroups['65+']++
      }

      // Marital status
      const status = member.user?.marital_status || 'unknown'
      maritalStatus[status] = (maritalStatus[status] || 0) + 1

      // Groups (for now, we'll add default groups - this will be enhanced later)
      if (member.dob) {
        const age = today.getFullYear() - new Date(member.dob).getFullYear()
        if (age <= 17) {
          groups['Children'] = (groups['Children'] || 0) + 1
        } else if (age <= 35) {
          groups['Youth'] = (groups['Youth'] || 0) + 1
        } else if (member.gender === 'male') {
          groups['Men Fellowship'] = (groups['Men Fellowship'] || 0) + 1
        } else {
          groups['Women Fellowship'] = (groups['Women Fellowship'] || 0) + 1
        }
      }
    })

    return { gender, ageGroups, maritalStatus, groups }
  }

  console.log('Dashboard - Auth state:', { user, authLoading })

  // Redirect to auth if no user - must be first useEffect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      // Fetch member data
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!memberError && memberData) {
        setMember(memberData)
      }

      // Fetch dashboard stats
      await fetchStats()
      
      // Fetch upcoming events
      await fetchUpcomingEvents()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const startOfMonth = new Date()
      startOfMonth.setMonth(startOfMonth.getMonth(), 1)

      let statsQuery = supabase.from('attendance').select('id, service_date, member_id, dependant_id')

      // Apply role-based filtering
      if (user.role === 'member') {
        const { data: memberData } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (memberData) {
          statsQuery = statsQuery.eq('member_id', memberData.id)
        }
      }

      const { data: attendanceData } = await statsQuery

      // Get member counts
      const { data: membersData } = await supabase
        .from('members')
        .select(`
          *,
          user:app_users(full_name, membership_id, phone, email, role, marital_status, created_at)
        `)
        .eq('is_active', true)

      // Get donations (if user has permission)
      let donationsData = null
      if (['admin', 'finance_officer', 'pastor'].includes(user.role)) {
        const { data } = await supabase
          .from('donations')
          .select('amount, donation_date')
          .gte('donation_date', startOfMonth.toISOString().split('T')[0])
        
        donationsData = data
      }

      // Get upcoming events
      const { data: upcomingEvents } = await supabase
        .from('members')
        .select('dob, date_of_baptism, date_of_holy_ghost_baptism')
        .not('dob', 'is', null)

      // Calculate upcoming birthdays (next 30 days)
      const todayForEvents = new Date()
      const thirtyDaysFromNow = new Date(todayForEvents.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      let upcomingBirthdays = 0
      let upcomingAnniversaries = 0

      if (upcomingEvents) {
        upcomingEvents.forEach(event => {
          if (event.dob) {
            const birthday = new Date(event.dob)
            birthday.setFullYear(todayForEvents.getFullYear())
            
            // If birthday has passed this year, check next year
            if (birthday < todayForEvents) {
              birthday.setFullYear(todayForEvents.getFullYear() + 1)
            }
            
            if (birthday >= todayForEvents && birthday <= thirtyDaysFromNow) {
              upcomingBirthdays++
            }
          }

          if (event.date_of_baptism) {
            const anniversary = new Date(event.date_of_baptism)
            anniversary.setFullYear(todayForEvents.getFullYear())
            
            if (anniversary < todayForEvents) {
              anniversary.setFullYear(todayForEvents.getFullYear() + 1)
            }
            
            if (anniversary >= todayForEvents && anniversary <= thirtyDaysFromNow) {
              upcomingAnniversaries++
            }
          }

          if (event.date_of_holy_ghost_baptism) {
            const hgAnniversary = new Date(event.date_of_holy_ghost_baptism)
            hgAnniversary.setFullYear(todayForEvents.getFullYear())
            
            if (hgAnniversary < todayForEvents) {
              hgAnniversary.setFullYear(todayForEvents.getFullYear() + 1)
            }
            
            if (hgAnniversary >= todayForEvents && hgAnniversary <= thirtyDaysFromNow) {
              upcomingAnniversaries++
            }
          }
        })
      }

      // Calculate stats
      const totalMembers = membersData?.length || 0
      const activeMembers = membersData?.filter(m => m.status === 'active').length || 0
      const todayAttendance = attendanceData?.filter(a => a.service_date === today).length || 0
      const weeklyAttendance = attendanceData?.filter(a => 
        a.service_date >= startOfWeek.toISOString().split('T')[0]
      ).length || 0
      const monthlyDonations = donationsData?.reduce((sum, d) => sum + d.amount, 0) || 0

      setStats({
        total_members: totalMembers,
        active_members: activeMembers,
        visitors: 0,
        today_attendance: todayAttendance,
        weekly_attendance: weeklyAttendance,
        monthly_donations: monthlyDonations,
        pending_pledges: 0,
        prayer_requests: 0,
        upcoming_birthdays: upcomingBirthdays,
        upcoming_anniversaries: upcomingAnniversaries
      })

      // Calculate demographics
      const demographicsData = calculateDemographics(membersData || [])
      setDemographics(demographicsData)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchUpcomingEvents = async () => {
    if (!user) return

    try {
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      // Get members with their user data and upcoming events
      const { data: membersData, error } = await supabase
        .from('members')
        .select(`
          dob,
          date_of_baptism,
          date_of_holy_ghost_baptism,
          user:app_users!inner (
            full_name,
            phone,
            first_name,
            last_name
          )
        `)
        .not('dob', 'is', null)

      if (error) {
        console.error('Error fetching upcoming events:', error)
        return
      }

      const events: any[] = []

      if (membersData) {
        membersData.forEach(member => {
          const userData = member.user as any
          const memberName = userData?.full_name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim()
          const phone = userData?.phone

          // Check birthday
          if (member.dob) {
            const birthday = new Date(member.dob)
            birthday.setFullYear(today.getFullYear())
            
            if (birthday < today) {
              birthday.setFullYear(today.getFullYear() + 1)
            }
            
            if (birthday >= today && birthday <= thirtyDaysFromNow) {
              const daysUntil = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              events.push({
                type: 'birthday',
                name: memberName,
                phone: phone,
                date: birthday,
                daysUntil: daysUntil,
                displayDate: birthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              })
            }
          }

          // Check baptism anniversary
          if (member.date_of_baptism) {
            const anniversary = new Date(member.date_of_baptism)
            anniversary.setFullYear(today.getFullYear())
            
            if (anniversary < today) {
              anniversary.setFullYear(today.getFullYear() + 1)
            }
            
            if (anniversary >= today && anniversary <= thirtyDaysFromNow) {
              const daysUntil = Math.ceil((anniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              events.push({
                type: 'baptism_anniversary',
                name: memberName,
                phone: phone,
                date: anniversary,
                daysUntil: daysUntil,
                displayDate: anniversary.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              })
            }
          }

          // Check Holy Ghost baptism anniversary
          if (member.date_of_holy_ghost_baptism) {
            const hgAnniversary = new Date(member.date_of_holy_ghost_baptism)
            hgAnniversary.setFullYear(today.getFullYear())
            
            if (hgAnniversary < today) {
              hgAnniversary.setFullYear(today.getFullYear() + 1)
            }
            
            if (hgAnniversary >= today && hgAnniversary <= thirtyDaysFromNow) {
              const daysUntil = Math.ceil((hgAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              events.push({
                type: 'holy_ghost_anniversary',
                name: memberName,
                phone: phone,
                date: hgAnniversary,
                daysUntil: daysUntil,
                displayDate: hgAnniversary.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              })
            }
          }
        })
      }

      // Sort by date (earliest first)
      events.sort((a, b) => a.date.getTime() - b.date.getTime())
      
      // Take only the next 10 events
      setUpcomingEvents(events.slice(0, 10))

    } catch (error) {
      console.error('Error fetching upcoming events:', error)
    }
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-72 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col">
          <div className="p-6 border-b border-blue-700">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="h-8 w-8 text-blue-900" />
              </div>
              <div>
                <h1 className="font-bold text-xl" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Church of Pentecost</h1>
                <p className="text-blue-200 text-sm">Emmanuel Assembly</p>
                <p className="text-yellow-300 text-xs font-medium">Odorkor Area, Gbawe CP District</p>
              </div>
            </div>
          </div>
          <div className="animate-pulse p-4">
            <div className="h-8 bg-blue-700 rounded mb-4"></div>
            <div className="h-8 bg-blue-700 rounded mb-4"></div>
            <div className="h-8 bg-blue-700 rounded mb-4"></div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('emmanuel_assembly_test_user')
      window.location.href = '/auth'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col overflow-hidden`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-blue-700">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="h-8 w-8 text-blue-900" />
            </div>
            <div>
              <h1 className="font-bold text-xl" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Church of Pentecost</h1>
              <p className="text-blue-200 text-sm">Emmanuel Assembly</p>
              <p className="text-yellow-300 text-xs font-medium">Odorkor Area, Gbawe CP District</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="flex items-center space-x-3 bg-blue-800/50 p-3 rounded-lg">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-900" />
            </div>
            <div>
              <p className="font-semibold">{user.full_name}</p>
              <p className="text-blue-200 text-sm capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {/* Core Management */}
            <div className="mb-6">
              <h3 className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3 px-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Core Management</h3>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg bg-blue-700 text-white shadow-sm">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                  </a>
                </li>
                    <li>
                      <a href="/members" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                        <Users className="h-5 w-5" />
                        <span>Members</span>
                      </a>
                    </li>
                    <li>
                      <a href="/visitors" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                        <Users className="h-5 w-5" />
                        <span>Visitors</span>
                      </a>
                    </li>
                    <li>
                      <a href="/groups" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                        <Building2 className="h-5 w-5" />
                        <span>Groups</span>
                      </a>
                    </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Calendar className="h-5 w-5" />
                    <span>Events</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Building2 className="h-5 w-5" />
                    <span>Ministries</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Attendance System */}
            <div className="mb-6">
              <h3 className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3 px-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Attendance System</h3>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <QrCode className="h-5 w-5" />
                    <span>QR Scanner</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Monitor className="h-5 w-5" />
                    <span>Kiosk Mode</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <CheckSquare className="h-5 w-5" />
                    <span>Manual Check-in</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Financial Management */}
            <div className="mb-6">
              <h3 className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3 px-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Financial</h3>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <DollarSign className="h-5 w-5" />
                    <span>Donations</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <CreditCard className="h-5 w-5" />
                    <span>Payments</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <PieChart className="h-5 w-5" />
                    <span>Budget</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <FileText className="h-5 w-5" />
                    <span>Reports</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Communication */}
            <div className="mb-6">
              <h3 className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3 px-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Communication</h3>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <MessageSquare className="h-5 w-5" />
                    <span>SMS</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Mail className="h-5 w-5" />
                    <span>Email</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Bell className="h-5 w-5" />
                    <span>Notifications</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* AI Features */}
            <div className="mb-6">
              <h3 className="text-yellow-300 text-xs font-semibold uppercase tracking-wider mb-3 px-3 flex items-center" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                <Brain className="h-4 w-4 mr-2" />
                AI Features
              </h3>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span>Smart Insights</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Target className="h-5 w-5 text-yellow-400" />
                    <span>Analytics</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Activity className="h-5 w-5 text-yellow-400" />
                    <span>Attendance AI</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Gift className="h-5 w-5 text-yellow-400" />
                    <span>Recommendations</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3 px-3" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Settings</h3>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Settings className="h-5 w-5" />
                    <span>General</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-blue-200 hover:bg-blue-700 hover:text-white transition-colors">
                    <Shield className="h-5 w-5" />
                    <span>Security</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full p-3 rounded-lg text-blue-200 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Dashboard</h1>
                <p className="text-gray-600 text-sm">Welcome, {user.full_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      {stats?.total_members || 0}
                    </p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      ↑5.2%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Donations</p>
                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      ${stats?.monthly_donations?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      ↑12.7%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Events</p>
                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      {(stats?.upcoming_birthdays || 0) + (stats?.upcoming_anniversaries || 0)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {upcomingEvents.length > 0 ? `Next: ${upcomingEvents[0]?.type === 'birthday' ? 'Birthday' : 'Anniversary'}` : 'No upcoming events'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Active Groups</p>
                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      {stats?.total_members || 0}
                    </p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +3 new
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <a href="/members">
                    <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">Members</h3>
                          <p className="text-xs text-gray-600">Manage profiles</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>

                  <a href="/visitors">
                    <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">Visitors</h3>
                          <p className="text-xs text-gray-600">Track visitors</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>

                  <a href="/groups">
                    <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
                            <Building2 className="h-5 w-5 text-purple-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">Groups</h3>
                          <p className="text-xs text-gray-600">Manage ministries</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>

              <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Events</h3>
                    <p className="text-xs text-gray-600">Schedule events</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Donations</h3>
                    <p className="text-xs text-gray-600">Track giving</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Messages</h3>
                    <p className="text-xs text-gray-600">Send SMS/Email</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center mb-3">
                      <Building2 className="h-5 w-5 text-yellow-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Ministries</h3>
                    <p className="text-xs text-gray-600">Manage groups</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upcoming Events and Birthdays */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Events */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Upcoming Events</CardTitle>
                <CardDescription>Schedule for the week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Sunday Service</h4>
                      <p className="text-sm text-gray-600">Tomorrow, 8:00 AM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Youth Meeting</h4>
                      <p className="text-sm text-gray-600">Wednesday, 6:00 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Prayer Meeting</h4>
                      <p className="text-sm text-gray-600">Friday, 7:00 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Birthdays & Anniversaries */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Upcoming Birthdays & Anniversaries</CardTitle>
                <CardDescription>Celebrate with our members</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Cake className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No upcoming birthdays or anniversaries in the next 30 days</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.slice(0, 6).map((event, index) => {
                      const getIcon = () => {
                        switch (event.type) {
                          case 'birthday':
                            return <Cake className="h-6 w-6 text-yellow-600" />
                          case 'baptism_anniversary':
                            return <Droplets className="h-6 w-6 text-blue-600" />
                          case 'holy_ghost_anniversary':
                            return <Zap className="h-6 w-6 text-purple-600" />
                          default:
                            return <Calendar className="h-6 w-6 text-gray-600" />
                        }
                      }
                      
                      const getBgColor = () => {
                        switch (event.type) {
                          case 'birthday':
                            return 'bg-yellow-100'
                          case 'baptism_anniversary':
                            return 'bg-blue-100'
                          case 'holy_ghost_anniversary':
                            return 'bg-purple-100'
                          default:
                            return 'bg-gray-100'
                        }
                      }
                      
                      const getEventLabel = () => {
                        switch (event.type) {
                          case 'birthday':
                            return 'Birthday'
                          case 'baptism_anniversary':
                            return 'Baptism Anniversary'
                          case 'holy_ghost_anniversary':
                            return 'Holy Ghost Anniversary'
                          default:
                            return 'Event'
                        }
                      }
                      
                      const getDaysText = () => {
                        if (event.daysUntil === 0) return 'Today'
                        if (event.daysUntil === 1) return 'Tomorrow'
                        return `${event.daysUntil} days`
                      }
                      
                      return (
                        <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-12 h-12 ${getBgColor()} rounded-lg flex items-center justify-center`}>
                            {getIcon()}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{event.name}</h4>
                            <p className="text-sm text-gray-600">
                              {getEventLabel()} • {event.displayDate}
                              {event.phone && ` • ${event.phone}`}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">{getDaysText()}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demographics & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gender Distribution */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Gender Distribution</CardTitle>
                  <CardDescription>Member demographics by gender</CardDescription>
                </CardHeader>
                <CardContent>
                  {demographics ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">Male</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{demographics.gender.male}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                          <span className="text-sm font-medium">Female</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{demographics.gender.female}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-pink-500 h-2 rounded-full" 
                             style={{ 
                               width: `${demographics.gender.male + demographics.gender.female > 0 ? 
                                 (demographics.gender.male / (demographics.gender.male + demographics.gender.female)) * 100 : 0}%` 
                             }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Loading demographics...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Age Groups */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Age Distribution</CardTitle>
                  <CardDescription>Members by age groups</CardDescription>
                </CardHeader>
                <CardContent>
                  {demographics ? (
                    <div className="space-y-3">
                      {Object.entries(demographics.ageGroups).map(([ageGroup, count]) => (
                        <div key={ageGroup} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">{ageGroup} years</span>
                          <div className="flex items-center space-x-3">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-yellow-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.max((count / Math.max(...Object.values(demographics.ageGroups))) * 100, 5)}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Loading age data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Church Groups */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Church Groups</CardTitle>
                  <CardDescription>Members by fellowship groups</CardDescription>
                </CardHeader>
                <CardContent>
                  {demographics ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(demographics.groups).map(([group, count]) => (
                        <div key={group} className="text-center p-4 bg-gradient-to-br from-blue-50 to-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{count}</div>
                          <div className="text-sm text-gray-600">{group}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Loading groups...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Marital Status */}
              <Card className="bg-white shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Marital Status</CardTitle>
                  <CardDescription>Family demographics</CardDescription>
                </CardHeader>
                <CardContent>
                  {demographics ? (
                    <div className="space-y-3">
                      {Object.entries(demographics.maritalStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 capitalize">{status}</span>
                          <span className="text-sm font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Loading status...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}