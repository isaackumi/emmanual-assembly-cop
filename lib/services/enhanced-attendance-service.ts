/**
 * Enhanced Attendance Service
 * Handles comprehensive attendance tracking with departments, duplicates prevention, and absentee management
 */

import { createClient } from '@/lib/supabase/client'
import { Attendance, Department, DepartmentMembership, AbsenteeRecord, AttendanceActivity, AppUser, Member } from '@/lib/types'
import { smsService } from './sms-service'

export interface AttendanceSession {
  id: string
  service_date: string
  service_type: string
  start_time: string
  end_time?: string
  total_attendance: number
  is_active: boolean
  created_by: string
  created_at: string
}

export interface AttendanceStats {
  total_attendance: number
  male_attendance: number
  female_attendance: number
  adult_attendance: number
  children_attendance: number
  department_stats: {
    [departmentName: string]: {
      total: number
      present: number
      absent: number
    }
  }
  duplicate_prevention: {
    blocked_duplicates: number
    sessions_checked: number
  }
}

export interface AttendanceAnalytics {
  daily_breakdown: {
    date: string
    total: number
    male: number
    female: number
    adults: number
    children: number
    departments: { [key: string]: number }
  }[]
  weekly_trends: {
    week: string
    total: number
    growth_rate: number
  }[]
  department_performance: {
    department: string
    attendance_rate: number
    total_members: number
    present_members: number
  }[]
  absentee_analysis: {
    total_absentees: number
    follow_up_pending: number
    sms_sent: number
    patterns: { [key: string]: number }
  }
}

class EnhancedAttendanceService {
  private supabase = createClient()

  // Create attendance session
  async createAttendanceSession(data: {
    service_date: string
    service_type: string
    created_by: string
  }): Promise<AttendanceSession> {
    const session = {
      id: `session_${Date.now()}`,
      service_date: data.service_date,
      service_type: data.service_type,
      start_time: new Date().toISOString(),
      total_attendance: 0,
      is_active: true,
      created_by: data.created_by,
      created_at: new Date().toISOString()
    }

    // In a real implementation, this would be stored in the database
    return session
  }

  // Check for duplicate attendance
  async checkDuplicateAttendance(memberId: string, serviceDate: string, serviceType: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('attendance')
      .select('id')
      .eq('member_id', memberId)
      .eq('service_date', serviceDate)
      .eq('service_type', serviceType)
      .eq('status', 'present')
      .limit(1)

    if (error) {
      console.error('Error checking duplicate attendance:', error)
      return false
    }

    return data && data.length > 0
  }

  // Record attendance with enhanced tracking
  async recordAttendance(data: {
    member_id: string
    service_date: string
    service_type: string
    method: 'qr' | 'kiosk' | 'admin' | 'pin' | 'mobile'
    created_by: string
    notes?: string
  }): Promise<{ attendance: Attendance; isDuplicate: boolean }> {
    // Check for duplicates
    const isDuplicate = await this.checkDuplicateAttendance(data.member_id, data.service_date, data.service_type)
    
    if (isDuplicate) {
      return {
        attendance: {} as Attendance,
        isDuplicate: true
      }
    }

    // Get member details for enhanced tracking
    const { data: memberData, error: memberError } = await this.supabase
      .from('members')
      .select(`
        *,
        user:app_users(*),
        department_memberships:department_memberships(
          department:departments(name)
        )
      `)
      .eq('id', data.member_id)
      .single()

    if (memberError) {
      throw new Error('Failed to fetch member data')
    }

    const member = memberData.user?.[0] || memberData.user
    const departments = memberData.department_memberships?.map((dm: any) => dm.department?.name).filter(Boolean) || []
    
    // Determine age category and gender
    const ageCategory = this.getAgeCategory(member?.dob || memberData.dob)
    const gender = member?.gender || memberData.gender

    // Create attendance record
    const attendanceRecord = {
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: data.service_type,
      check_in_time: new Date().toISOString(),
      method: data.method,
      metadata: {
        departments,
        age_category: ageCategory,
        gender,
        is_duplicate: false
      },
      status: 'present',
      notes: data.notes,
      created_by: data.created_by,
      created_at: new Date().toISOString()
    }

    const { data: attendance, error } = await this.supabase
      .from('attendance')
      .insert(attendanceRecord)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log activity
    await this.logAttendanceActivity({
      type: 'check_in',
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: data.service_type,
      description: `${member?.full_name || 'Member'} checked in via ${data.method}`,
      metadata: { departments, age_category: ageCategory, gender },
      created_by: data.created_by
    })

    return { attendance, isDuplicate: false }
  }

  // Bulk attendance with duplicate prevention
  async recordBulkAttendance(data: {
    member_ids: string[]
    service_date: string
    service_type: string
    created_by: string
    method?: 'bulk' | 'admin'
  }): Promise<{ successful: number; duplicates: number; errors: number }> {
    let successful = 0
    let duplicates = 0
    let errors = 0

    for (const memberId of data.member_ids) {
      try {
        const result = await this.recordAttendance({
          member_id: memberId,
          service_date: data.service_date,
          service_type: data.service_type,
          method: 'admin',
          created_by: data.created_by
        })

        if (result.isDuplicate) {
          duplicates++
        } else {
          successful++
        }
      } catch (error) {
        console.error(`Error recording attendance for member ${memberId}:`, error)
        errors++
      }
    }

    // Log bulk activity
    await this.logAttendanceActivity({
      type: 'bulk_attendance',
      service_date: data.service_date,
      service_type: data.service_type,
      description: `Bulk attendance recorded: ${successful} successful, ${duplicates} duplicates, ${errors} errors`,
      metadata: { 
        total_members: data.member_ids.length,
        successful,
        duplicates,
        errors
      },
      created_by: data.created_by
    })

    return { successful, duplicates, errors }
  }

  // Mark absentee and create follow-up record
  async markAbsentee(data: {
    member_id: string
    service_date: string
    service_type: string
    reason?: string
    follow_up_required: boolean
    created_by: string
  }): Promise<AbsenteeRecord> {
    // Check if absentee record already exists
    // For now, we'll create a mock absentee record since the table doesn't exist yet
    // In production, you would create the absentee_records table
    const record: AbsenteeRecord = {
      id: `absentee-${Date.now()}`,
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: data.service_type,
      reason: data.reason,
      follow_up_required: data.follow_up_required || true,
      follow_up_completed: false,
      sms_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Log activity (this will also be mocked since the table doesn't exist)
    console.log('Absentee marked:', record)

    return record
  }

  // Send SMS to absentees
  async sendAbsenteeSMS(absenteeId: string): Promise<boolean> {
    try {
      // Since we don't have the absentee_records table yet, we'll simulate SMS sending
      // In production, you would fetch the actual absentee record from the database
      console.log(`Sending SMS for absentee ID: ${absenteeId}`)
      
      // Simulate SMS sending with dummy data
      await smsService.sendMessage({
        recipient: {
          name: 'Member',
          phone: '+233241234567',
          membership_id: 'EA-2024-001'
        },
        message: `Hello, we noticed you were absent from the recent service. We hope you're doing well and look forward to seeing you next time!`,
        type: 'custom',
        created_by: 'system'
      })

      return true
    } catch (error) {
      console.error('Error sending SMS to absentee:', error)
      return false
    }
  }

  // Get attendance statistics
  async getAttendanceStats(dateRange: { start: string; end: string }): Promise<AttendanceStats> {
    const { data: attendance, error } = await this.supabase
      .from('attendance')
      .select(`
        *,
        member:members(
          user:app_users(id, full_name, membership_id, phone, email),
          department_memberships:department_memberships(
            department:departments(name)
          )
        )
      `)
      .eq('status', 'present')
      .gte('service_date', dateRange.start)
      .lte('service_date', dateRange.end)

    if (error) {
      throw error
    }

    const stats: AttendanceStats = {
      total_attendance: attendance?.length || 0,
      male_attendance: 0,
      female_attendance: 0,
      adult_attendance: 0,
      children_attendance: 0,
      department_stats: {},
      duplicate_prevention: {
        blocked_duplicates: 0,
        sessions_checked: 0
      }
    }

    attendance?.forEach(record => {
      const member = record.member?.user?.[0] || record.member?.user
      const gender = record.metadata?.gender || member?.gender
      const ageCategory = record.metadata?.age_category || this.getAgeCategory(member?.dob)
      const departments = record.metadata?.departments || []

      // Gender stats
      if (gender === 'male') stats.male_attendance++
      else if (gender === 'female') stats.female_attendance++

      // Age category stats
      if (ageCategory === 'adult') stats.adult_attendance++
      else if (ageCategory === 'child') stats.children_attendance++

      // Department stats
      departments.forEach((dept: string) => {
        if (!stats.department_stats[dept]) {
          stats.department_stats[dept] = { total: 0, present: 0, absent: 0 }
        }
        stats.department_stats[dept].present++
        stats.department_stats[dept].total++
      })
    })

    return stats
  }

  // Get recent attendance activity
  async getRecentActivity(limit: number = 20): Promise<AttendanceActivity[]> {
    const { data, error } = await this.supabase
      .from('attendance_activities')
      .select(`
        *,
        member:members(
          user:app_users(full_name)
        ),
        created_user:app_users(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return data || []
  }

  // Log attendance activity
  private async logAttendanceActivity(data: {
    type: 'check_in' | 'check_out' | 'bulk_attendance' | 'absentee_marked' | 'follow_up'
    member_id?: string
    service_date: string
    service_type: string
    description: string
    metadata?: Record<string, any>
    created_by: string
  }): Promise<void> {
    const activity = {
      type: data.type,
      member_id: data.member_id,
      service_date: data.service_date,
      service_type: data.service_type,
      description: data.description,
      metadata: data.metadata || {},
      created_by: data.created_by,
      created_at: new Date().toISOString()
    }

    await this.supabase
      .from('attendance_activities')
      .insert(activity)
  }

  // Helper function to determine age category
  private getAgeCategory(dob?: string): 'adult' | 'child' {
    if (!dob) return 'adult'
    
    const age = new Date().getFullYear() - new Date(dob).getFullYear()
    return age < 18 ? 'child' : 'adult'
  }

  // Get departments
  async getDepartments(): Promise<Department[]> {
    const { data, error } = await this.supabase
      .from('departments')
      .select(`
        *,
        leader:app_users(full_name),
        co_leader:app_users(full_name)
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw error
    }

    return data || []
  }

  // Get department members
  async getDepartmentMembers(departmentId: string): Promise<DepartmentMembership[]> {
    const { data, error } = await this.supabase
      .from('department_memberships')
      .select(`
        *,
        member:members(
          user:app_users(full_name, membership_id, phone)
        )
      `)
      .eq('department_id', departmentId)
      .eq('is_active', true)

    if (error) {
      throw error
    }

    return data || []
  }
}

export const enhancedAttendanceService = new EnhancedAttendanceService()
export default enhancedAttendanceService
