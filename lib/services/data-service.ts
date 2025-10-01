import { createClient } from '@/lib/supabase/client'
import { AppUser, Member, Group, GroupMembership, Attendance, Visitor, DashboardStats } from '@/lib/types'
import { cache, cacheKeys, cacheTTL, invalidateMemberCache, invalidateGroupCache, invalidateAttendanceCache, invalidateVisitorCache } from '@/lib/utils/cache'

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  error: string | null
  loading: boolean
}

class DataService {
  private supabase = createClient()

  // Generic error handler
  private handleError(error: any, context: string): string {
    console.error(`Error in ${context}:`, error)
    console.error('Error type:', typeof error)
    console.error('Error keys:', error ? Object.keys(error) : 'No keys')
    
    if (error?.message) {
      return error.message
    }
    
    if (error?.details) {
      return error.details
    }
    
    if (error?.hint) {
      return error.hint
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    if (error && typeof error === 'object') {
      return JSON.stringify(error)
    }
    
    return 'An unexpected error occurred'
  }

  // Generic data fetcher with loading states
  private async fetchData<T>(
    query: () => Promise<{ data: T | null; error: any }>,
    context: string
  ): Promise<ApiResponse<T>> {
    try {
      const result = await query()
      
      if (result.error) {
        throw result.error
      }
      
      return {
        data: result.data,
        error: null,
        loading: false
      }
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, context),
        loading: false
      }
    }
  }

  // Generic paginated data fetcher
  private async fetchPaginatedData<T>(
    query: () => Promise<{ data: T[] | null; error: any; count: number | null }>,
    page: number = 1,
    limit: number = 20,
    context: string
  ): Promise<PaginatedResponse<T>> {
    try {
      const result = await query()
      
      if (result.error) {
        throw result.error
      }
      
      const data = result.data || []
      const total = result.count || 0
      const hasMore = (page * limit) < total
      
      return {
        data,
        total,
        page,
        limit,
        hasMore,
        error: null,
        loading: false
      }
    } catch (error) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: this.handleError(error, context),
        loading: false
      }
    }
  }

  // Dashboard Data
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const cacheKey = cacheKeys.dashboardStats()
    const cached = cache.get<DashboardStats>(cacheKey)
    
    if (cached) {
      return { data: cached, error: null, loading: false }
    }

    return this.fetchData(async () => {
      const [
        { data: membersData, error: membersError },
        { data: groupsData, error: groupsError },
        { data: attendanceData, error: attendanceError },
        { data: visitorsData, error: visitorsError }
      ] = await Promise.all([
        this.supabase
          .from('members')
          .select('*')
          .eq('status', 'active'),
        
        this.supabase
          .from('groups')
          .select('*')
          .eq('is_active', true),
        
        this.supabase
          .from('attendance')
          .select(`
            *,
            member:members(gender, dob)
          `)
          .gte('service_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        this.supabase
          .from('visitors')
          .select('*')
          .gte('visit_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ])

      if (membersError) throw membersError
      if (groupsError) throw groupsError
      if (attendanceError) throw attendanceError
      if (visitorsError) throw visitorsError

      // Calculate stats
      const totalMembers = membersData?.length || 0
      const totalGroups = groupsData?.length || 0
      const recentAttendance = attendanceData?.length || 0
      const recentVisitors = visitorsData?.length || 0

      // Calculate attendance analytics
      const today = new Date().toISOString().split('T')[0]
      const todayAttendance = attendanceData?.filter(record => record.service_date === today).length || 0
      
      // Gender distribution in attendance
      const maleAttendance = attendanceData?.filter(record => {
        const member = Array.isArray(record.member) ? record.member[0] : record.member
        return member?.gender === 'male'
      }).length || 0
      
      const femaleAttendance = attendanceData?.filter(record => {
        const member = Array.isArray(record.member) ? record.member[0] : record.member
        return member?.gender === 'female'
      }).length || 0

      // Age distribution in attendance
      const adultAttendance = attendanceData?.filter(record => {
        const member = Array.isArray(record.member) ? record.member[0] : record.member
        if (!member?.dob) return false
        const age = new Date().getFullYear() - new Date(member.dob).getFullYear()
        return age >= 18
      }).length || 0
      
      const childrenAttendance = attendanceData?.filter(record => {
        const member = Array.isArray(record.member) ? record.member[0] : record.member
        if (!member?.dob) return false
        const age = new Date().getFullYear() - new Date(member.dob).getFullYear()
        return age < 18
      }).length || 0

      const stats: DashboardStats = {
        total_members: totalMembers,
        active_members: totalMembers, // Same as total for now
        visitors: recentVisitors,
        today_attendance: todayAttendance,
        weekly_attendance: recentAttendance,
        monthly_donations: 0,
        pending_pledges: 0,
        prayer_requests: 0,
        upcoming_birthdays: 0,
        upcoming_anniversaries: 0,
        groups_count: totalGroups,
        recent_visitors: recentVisitors,
        attendance_rate: totalMembers > 0 ? Math.round((recentAttendance / totalMembers) * 100) : 0,
        visitor_conversion_rate: recentVisitors > 0 ? Math.round((recentVisitors / (recentVisitors + totalMembers)) * 100) : 0,
        // Enhanced attendance analytics
        male_attendance: maleAttendance,
        female_attendance: femaleAttendance,
        adult_attendance: adultAttendance,
        children_attendance: childrenAttendance,
        total_attendance: recentAttendance
      }

      // Cache the result
      cache.set(cacheKey, stats, cacheTTL.MEDIUM)
      return { data: stats, error: null }
    }, 'getDashboardStats')
  }

  // Members Data
  async getMembers(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResponse<Member>> {
    try {
      const cacheKey = cacheKeys.members(page, limit, search)
      const cached = cache.get<{ data: Member[]; total: number }>(cacheKey)
      
      if (cached) {
        const hasMore = (page * limit) < cached.total
        return {
          data: cached.data,
          total: cached.total,
          page,
          limit,
          hasMore,
          error: null,
          loading: false
        }
      }

      console.log('Fetching members with params:', { page, limit, search })

      return this.fetchPaginatedData(async () => {
        // First, let's try a simple query to see if the table exists
        const { data: testData, error: testError } = await this.supabase
          .from('members')
          .select('id')
          .limit(1)

        if (testError) {
          console.error('Test query failed:', testError)
          throw new Error(`Database connection failed: ${testError.message || JSON.stringify(testError)}`)
        }

        let query = this.supabase
          .from('members')
          .select(`
            *,
            user:app_users(
              id, full_name, membership_id, phone, email, role, 
              marital_status, created_at, join_year, updated_at
            )
          `, { count: 'exact' })
          .eq('status', 'active')

        if (search) {
          query = query.or(`user.full_name.ilike.%${search}%,user.membership_id.ilike.%${search}%`)
        }

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1)

        console.log('Members query result:', { 
          dataLength: data?.length, 
          error: error ? {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          } : null, 
          count 
        })

        if (error) {
          throw new Error(`Query failed: ${error.message || JSON.stringify(error)}`)
        }

        // Cache the result
        if (data) {
          cache.set(cacheKey, { data, total: count || 0 }, cacheTTL.MEDIUM)
        }
        return { data, error, count }
      }, page, limit, 'getMembers')
    } catch (error) {
      console.error('Error in getMembers:', error)
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        error: this.handleError(error, 'getMembers'),
        loading: false
      }
    }
  }

  async getMember(id: string): Promise<ApiResponse<Member>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('members')
        .select(`
          *,
          user:app_users(
            id, full_name, membership_id, phone, email, role,
            marital_status, created_at, join_year, updated_at
          )
        `)
        .eq('id', id)
        .single()

      return { data, error }
    }, 'getMember')
  }

  async createMember(memberData: Partial<Member>): Promise<ApiResponse<Member>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('members')
        .insert(memberData)
        .select(`
          *,
          user:app_users(
            id, full_name, membership_id, phone, email, role,
            marital_status, created_at, join_year, updated_at
          )
        `)
        .single()

      // Invalidate cache on successful creation
      if (!error) {
        invalidateMemberCache()
      }

      return { data, error }
    }, 'createMember')
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<ApiResponse<Member>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          user:app_users(
            id, full_name, membership_id, phone, email, role,
            marital_status, created_at, join_year, updated_at
          )
        `)
        .single()

      return { data, error }
    }, 'updateMember')
  }

  // Groups Data
  async getGroups(page: number = 1, limit: number = 20, search?: string, type?: string): Promise<PaginatedResponse<Group>> {
    return this.fetchPaginatedData(async () => {
      let query = this.supabase
        .from('groups')
        .select(`
          *,
          leader:app_users!leader_id(id, full_name, membership_id, phone, email, role),
          co_leader:app_users!co_leader_id(id, full_name, membership_id, phone, email, role)
        `, { count: 'exact' })
        .eq('is_active', true)

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (type) {
        query = query.eq('group_type', type)
      }

      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range((page - 1) * limit, page * limit - 1)

      return { data, error, count }
    }, page, limit, 'getGroups')
  }

  async getGroup(id: string): Promise<ApiResponse<Group>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('groups')
        .select(`
          *,
          leader:app_users!leader_id(id, full_name, membership_id, phone, email, role),
          co_leader:app_users!co_leader_id(id, full_name, membership_id, phone, email, role)
        `)
        .eq('id', id)
        .single()

      return { data, error }
    }, 'getGroup')
  }

  async createGroup(groupData: Partial<Group>): Promise<ApiResponse<Group>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('groups')
        .insert(groupData)
        .select(`
          *,
          leader:app_users!leader_id(id, full_name, membership_id, phone, email, role),
          co_leader:app_users!co_leader_id(id, full_name, membership_id, phone, email, role)
        `)
        .single()

      return { data, error }
    }, 'createGroup')
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<ApiResponse<Group>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          leader:app_users!leader_id(id, full_name, membership_id, phone, email, role),
          co_leader:app_users!co_leader_id(id, full_name, membership_id, phone, email, role)
        `)
        .single()

      return { data, error }
    }, 'updateGroup')
  }

  // Group Memberships
  async getGroupMembers(groupId: string): Promise<ApiResponse<GroupMembership[]>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('group_members')
        .select(`
          *,
          member:members!inner(
            id,
            user:app_users(id, full_name, membership_id, phone, email, role)
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('joined_date', { ascending: false })

      return { data, error }
    }, 'getGroupMembers')
  }

  async addGroupMember(groupId: string, memberId: string, role: string): Promise<ApiResponse<GroupMembership>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          member_id: memberId,
          role,
          joined_date: new Date().toISOString(),
          is_active: true
        })
        .select(`
          *,
          member:members!inner(
            id,
            user:app_users(id, full_name, membership_id, phone, email, role)
          )
        `)
        .single()

      return { data, error }
    }, 'addGroupMember')
  }

  async removeGroupMember(membershipId: string): Promise<ApiResponse<boolean>> {
    return this.fetchData(async () => {
      const { error } = await this.supabase
        .from('group_members')
        .update({ is_active: false })
        .eq('id', membershipId)

      return { data: !error, error }
    }, 'removeGroupMember')
  }

  // Attendance Data
  async getAttendanceHistory(memberId?: string, limit: number = 50): Promise<ApiResponse<Attendance[]>> {
    return this.fetchData(async () => {
      let query = this.supabase
        .from('attendance')
        .select('*')
        .order('service_date', { ascending: false })

      if (memberId) {
        query = query.eq('member_id', memberId)
      }

      const { data, error } = await query.limit(limit)

      return { data, error }
    }, 'getAttendanceHistory')
  }

  async createAttendance(attendanceData: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single()

      // Invalidate cache
      invalidateAttendanceCache()

      return { data, error }
    }, 'createAttendance')
  }

  async recordAttendance(data: {
    member_id: string
    service_date: string
    service_type: string
    check_in_time: string
    status: string
    checked_in_by: string
  }): Promise<ApiResponse<any>> {
    return this.fetchData(async () => {
      const { data: result, error } = await this.supabase
        .from('attendance')
        .insert(data)
        .select()
        .single()

      if (error) throw error

      // Invalidate cache
      invalidateAttendanceCache()

      return { data: result, error: null }
    }, 'recordAttendance')
  }

  async getAttendanceRecords(filters?: {
    service_date?: string
    service_type?: string
    member_id?: string
    limit?: number
  }): Promise<ApiResponse<any[]>> {
    return this.fetchData(async () => {
      let query = this.supabase
        .from('attendance')
        .select(`
          id,
          member_id,
          service_date,
          service_type,
          check_in_time,
          status,
          member:app_users(full_name, membership_id)
        `)
        .eq('status', 'present')
        .order('check_in_time', { ascending: false })

      if (filters?.service_date) {
        query = query.eq('service_date', filters.service_date)
      }
      if (filters?.service_type) {
        query = query.eq('service_type', filters.service_type)
      }
      if (filters?.member_id) {
        query = query.eq('member_id', filters.member_id)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      return { data, error }
    }, 'getAttendanceRecords')
  }

  async getAttendanceStats(): Promise<ApiResponse<{
    total_attendance: number
    today_attendance: number
    weekly_attendance: number
    monthly_attendance: number
  }>> {
    return this.fetchData(async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

      const [
        { data: totalData },
        { data: todayData },
        { data: weekData },
        { data: monthData }
      ] = await Promise.all([
        this.supabase.from('attendance').select('id').eq('status', 'present'),
        this.supabase.from('attendance').select('id').eq('status', 'present').eq('service_date', today),
        this.supabase.from('attendance').select('id').eq('status', 'present').gte('service_date', weekStart),
        this.supabase.from('attendance').select('id').eq('status', 'present').gte('service_date', monthStart)
      ])

      const stats = {
        total_attendance: totalData?.length || 0,
        today_attendance: todayData?.length || 0,
        weekly_attendance: weekData?.length || 0,
        monthly_attendance: monthData?.length || 0
      }

      return { data: stats, error: null }
    }, 'getAttendanceStats')
  }

  // Visitors Data
  async getVisitors(page: number = 1, limit: number = 20, search?: string): Promise<PaginatedResponse<Visitor>> {
    return this.fetchPaginatedData(async () => {
      let query = this.supabase
        .from('visitors')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error, count } = await query
        .order('visit_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      return { data, error, count }
    }, page, limit, 'getVisitors')
  }

  async createVisitor(visitorData: Partial<Visitor>): Promise<ApiResponse<Visitor>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('visitors')
        .insert(visitorData)
        .select()
        .single()

      return { data, error }
    }, 'createVisitor')
  }

  // Upcoming Events
  async getUpcomingEvents(): Promise<ApiResponse<{ birthdays: Member[]; anniversaries: Member[] }>> {
    return this.fetchData(async () => {
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      // Get members with upcoming birthdays
      const { data: membersData, error } = await this.supabase
        .from('members')
        .select(`
          *,
          user:app_users(
            id, full_name, membership_id, phone, email, role,
            marital_status, created_at, join_year, updated_at
          )
        `)
        .eq('status', 'active')
        .not('dob', 'is', null)

      if (error) throw error

      const upcomingBirthdays: Member[] = []
      const upcomingAnniversaries: Member[] = []

      membersData?.forEach((member) => {
        if (member.dob) {
          const daysUntil = this.getUpcomingEventDays(member.dob, 'birthday')
          if (daysUntil !== null && daysUntil <= 30) {
            upcomingBirthdays.push(member)
          }
        }

        if (member.user?.marital_status === 'married' && member.user?.anniversary_date) {
          const daysUntil = this.getUpcomingEventDays(member.user.anniversary_date, 'anniversary')
          if (daysUntil !== null && daysUntil <= 30) {
            upcomingAnniversaries.push(member)
          }
        }
      })

      return {
        data: {
          birthdays: upcomingBirthdays.sort((a, b) => {
            const aDays = this.getUpcomingEventDays(a.dob!, 'birthday') || 999
            const bDays = this.getUpcomingEventDays(b.dob!, 'birthday') || 999
            return aDays - bDays
          }),
          anniversaries: upcomingAnniversaries.sort((a, b) => {
            const aDays = this.getUpcomingEventDays(a.user?.anniversary_date!, 'anniversary') || 999
            const bDays = this.getUpcomingEventDays(b.user?.anniversary_date!, 'anniversary') || 999
            return aDays - bDays
          })
        },
        error: null
      }
    }, 'getUpcomingEvents')
  }

  async getAttendanceByMember(memberId: string, limit: number = 50): Promise<ApiResponse<Attendance[]>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('member_id', memberId)
        .order('service_date', { ascending: false })
        .limit(limit)

      return { data: (data as unknown as Attendance[]) || [], error }
    }, 'getAttendanceByMember')
  }

  private getUpcomingEventDays(dateString: string, type: 'birthday' | 'anniversary'): number | null {
    try {
      const today = new Date()
      const eventDate = new Date(dateString)
      const currentYear = today.getFullYear()
      
      // Set the event date to this year
      const thisYearEvent = new Date(eventDate)
      thisYearEvent.setFullYear(currentYear)
      
      // If the event has already passed this year, set it to next year
      if (thisYearEvent < today) {
        thisYearEvent.setFullYear(currentYear + 1)
      }
      
      const diffTime = thisYearEvent.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays >= 0 ? diffDays : null
    } catch (error) {
      return null
    }
  }



  async getAttendanceAnalytics(filters: {
    timeRange?: string
    serviceType?: string
  } = {}): Promise<{ data: any, error: string | null }> {
    try {
      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      
      switch (filters.timeRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate.setDate(now.getDate() - 30)
      }

      // Fetch attendance records
      let query = this.supabase
        .from('attendance')
        .select(`
          id,
          member_id,
          service_date,
          service_type,
          check_in_time,
          status,
          member:app_users(full_name, membership_id)
        `)
        .gte('service_date', startDate.toISOString().split('T')[0])
        .eq('status', 'present')

      if (filters.serviceType && filters.serviceType !== 'all') {
        query = query.eq('service_type', filters.serviceType)
      }

      const { data: attendanceData, error: attendanceError } = await query

      if (attendanceError) throw attendanceError

      // Process analytics data (simplified version)
      const processedAnalytics = {
        total_attendance: attendanceData?.length || 0,
        average_attendance: 0,
        attendance_trend: 'stable' as const,
        attendance_change_percentage: 0,
        service_breakdown: [],
        daily_attendance: [],
        weekly_attendance: [],
        monthly_attendance: [],
        attendance_by_gender: []
      }

      return { data: processedAnalytics, error: null }
    } catch (error) {
      console.error('Error fetching attendance analytics:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch attendance analytics'
      }
    }
  }

  // Utility methods
  async getAllMembers(): Promise<ApiResponse<AppUser[]>> {
    return this.fetchData(async () => {
      const { data, error } = await this.supabase
        .from('app_users')
        .select('id, full_name, membership_id, phone, email, role, join_year, created_at, updated_at')
        .not('role', 'eq', 'visitor')
        .order('full_name', { ascending: true })

      return { data, error }
    }, 'getAllMembers')
  }
}

// Export singleton instance
export const dataService = new DataService()
