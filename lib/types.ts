/**
 * Type definitions for the Church Management System
 */

export type UserRole = 'admin' | 'pastor' | 'elder' | 'finance_officer' | 'member' | 'visitor'
export type MemberStatus = 'active' | 'visitor' | 'transferred' | 'inactive'
export type AttendanceMethod = 'qr' | 'kiosk' | 'admin' | 'pin' | 'mobile'
export type ServiceType = 'sunday_service' | 'midweek_service' | 'prayer_meeting' | 'youth_service' | 'children_service' | 'special_event'

export interface AppUser {
  id: string
  auth_uid?: string
  membership_id: string
  phone?: string
  secondary_phone?: string
  email?: string
  full_name: string
  first_name?: string
  middle_name?: string
  last_name?: string
  role: UserRole
  join_year: number
  occupation?: string
  place_of_work?: string
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated'
  spouse_name?: string
  anniversary_date?: string
  children_count?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  user_id: string
  dob?: string
  gender?: 'male' | 'female' | 'other'
  address?: string
  emergency_contacts: EmergencyContact[]
  profile_photo?: string
  documents: Document[]
  status: MemberStatus
  notes?: string
  date_of_baptism?: string
  holy_ghost_baptism?: boolean
  date_of_holy_ghost_baptism?: string
  previous_church?: string
  reason_for_leaving?: string
  special_skills?: string[]
  interests?: string[]
  profile_photo_url?: string
  is_visitor?: boolean
  visitor_since?: string
  visitor_converted_to_member?: boolean
  created_at: string
  updated_at: string
  // Joined data
  user?: AppUser
  dependants?: Dependant[]
  group_memberships?: GroupMembership[]
}

export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

export interface Document {
  name: string
  type: string
  url: string
  uploaded_at: string
}

export interface Dependant {
  id: string
  member_id: string
  first_name: string
  middle_name?: string
  last_name?: string
  relationship: 'child' | 'spouse' | 'sibling' | 'parent' | 'guardian' | 'other'
  dob?: string
  gender?: 'male' | 'female'
  phone?: string
  email?: string
  occupation?: string
  is_member?: boolean
  membership_id?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined data
  member?: Member
}

export interface Group {
  id: string
  name: string
  description?: string
  group_type: 'ministry' | 'fellowship' | 'age_group' | 'special_interest' | 'leadership'
  leader_id?: string
  co_leader_id?: string
  meeting_schedule?: string
  meeting_location?: string
  is_active: boolean
  max_members?: number
  created_at: string
  updated_at: string
  // Joined data
  leader?: AppUser
  co_leader?: AppUser
  members?: GroupMembership[]
}

export interface GroupMembership {
  id: string
  group_id: string
  member_id: string
  role: 'leader' | 'co_leader' | 'member' | 'volunteer'
  joined_date: string
  is_active: boolean
  notes?: string
  created_at: string
  // Joined data
  group?: Group
  member?: Member
}

export interface Visitor {
  id: string
  first_name: string
  last_name?: string
  phone?: string
  email?: string
  address?: string
  visit_date: string
  service_attended?: string
  how_heard_about_church?: string
  invited_by_member_id?: string
  follow_up_notes?: string
  follow_up_date?: string
  follow_up_completed: boolean
  converted_to_member: boolean
  converted_member_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  invited_by?: Member
  converted_member?: Member
}

export interface Attendance {
  id: string
  member_id?: string
  dependant_id?: string
  service_date: string
  service_type?: ServiceType
  check_in_time: string
  method: AttendanceMethod
  metadata: Record<string, any>
  client_uuid?: string
  created_by?: string
  created_at: string
  // Joined data
  member?: Member
  dependant?: Dependant
  creator?: AppUser
}

export interface Donation {
  id: string
  member_id: string
  amount: number
  donation_type: string
  description?: string
  donation_date: string
  payment_method?: string
  reference_number?: string
  created_by?: string
  created_at: string
  // Joined data
  member?: Member
  creator?: AppUser
}

export interface Pledge {
  id: string
  member_id: string
  amount: number
  pledge_type: string
  description?: string
  pledge_date: string
  due_date?: string
  status: 'pending' | 'fulfilled' | 'partial' | 'cancelled'
  created_at: string
  // Joined data
  member?: Member
}

export interface Expense {
  id: string
  amount: number
  category: string
  description?: string
  expense_date: string
  receipt_url?: string
  approved_by?: string
  created_by?: string
  created_at: string
  // Joined data
  approver?: AppUser
  creator?: AppUser
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  content: string
  message_type: 'general' | 'announcement' | 'prayer_request' | 'urgent'
  is_read: boolean
  sent_at: string
  read_at?: string
  // Joined data
  sender?: AppUser
  recipient?: AppUser
}

export interface PrayerRequest {
  id: string
  member_id: string
  title: string
  description: string
  category?: string
  status: 'active' | 'answered' | 'closed'
  is_anonymous: boolean
  created_at: string
  updated_at: string
  // Joined data
  member?: Member
}

export interface Equipment {
  id: string
  name: string
  description?: string
  category?: string
  serial_number?: string
  purchase_date?: string
  purchase_price?: number
  current_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'broken'
  assigned_to?: string
  location?: string
  maintenance_notes?: string
  created_at: string
  updated_at: string
  // Joined data
  assignee?: AppUser
}

export interface AuditLog {
  id: string
  user_id?: string
  action: string
  table_name: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
  // Joined data
  user?: AppUser
}

export interface QRToken {
  id: string
  member_id: string
  token: string
  expires_at: string
  used_at?: string
  created_at: string
  // Joined data
  member?: Member
}

export interface SyncQueueItem {
  id: string
  client_uuid: string
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  data: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  retry_count: number
  created_at: string
  processed_at?: string
}

export interface Heartbeat {
  id: string
  service_name: string
  status: string
  last_ping: string
  metadata: Record<string, any>
}

// Form types
export interface CreateUserForm {
  // Personal Information
  first_name: string
  middle_name?: string
  last_name: string
  phone: string
  secondary_phone?: string
  email?: string
  role: UserRole
  
  // Professional Information
  occupation?: string
  place_of_work?: string
  
  // Family Information
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated'
  spouse_name?: string
  children_count?: number
  
  // Contact Information
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  
  // Spiritual Information
  dob?: string
  gender?: 'male' | 'female' | 'other'
  date_of_baptism?: string
  holy_ghost_baptism?: boolean
  date_of_holy_ghost_baptism?: string
  previous_church?: string
  reason_for_leaving?: string
  
  // Additional Information
  special_skills?: string[]
  interests?: string[]
  notes?: string
  
  // System fields
  join_year?: number
  membership_id?: string
  is_visitor?: boolean
}

export interface UpdateProfileForm {
  // Personal Information
  first_name?: string
  middle_name?: string
  last_name?: string
  phone?: string
  secondary_phone?: string
  email?: string
  
  // Professional Information
  occupation?: string
  place_of_work?: string
  
  // Family Information
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated'
  spouse_name?: string
  children_count?: number
  
  // Contact Information
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  
  // Spiritual Information
  dob?: string
  gender?: 'male' | 'female' | 'other'
  date_of_baptism?: string
  holy_ghost_baptism?: boolean
  date_of_holy_ghost_baptism?: string
  previous_church?: string
  reason_for_leaving?: string
  
  // Additional Information
  special_skills?: string[]
  interests?: string[]
  notes?: string
  profile_photo_url?: string
}

export interface CreateVisitorForm {
  first_name: string
  last_name?: string
  phone?: string
  email?: string
  address?: string
  visit_date: string
  service_attended?: string
  how_heard_about_church?: string
  invited_by_member_id?: string
  follow_up_notes?: string
  follow_up_date?: string
}

export interface CreateDependantForm {
  member_id: string
  first_name: string
  middle_name?: string
  last_name?: string
  relationship: 'child' | 'spouse' | 'sibling' | 'parent' | 'guardian' | 'other'
  dob?: string
  gender?: 'male' | 'female'
  phone?: string
  email?: string
  occupation?: string
  is_member?: boolean
  notes?: string
}

export interface AttendanceForm {
  member_id?: string
  dependant_id?: string
  service_type: ServiceType
  method: AttendanceMethod
  metadata?: Record<string, any>
}

export interface DonationForm {
  member_id: string
  amount: number
  donation_type: string
  description?: string
  donation_date: string
  payment_method?: string
  reference_number?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  page_size: number
  total_pages: number
}

// Search and filter types
export interface SearchFilters {
  query?: string
  role?: UserRole
  status?: MemberStatus
  join_year?: number
  page?: number
  page_size?: number
}

export interface AttendanceFilters {
  service_date?: string
  service_type?: ServiceType
  method?: AttendanceMethod
  member_id?: string
  page?: number
  page_size?: number
}

// Dashboard data types
export interface DashboardStats {
  total_members: number
  active_members: number
  visitors: number
  today_attendance: number
  weekly_attendance: number
  monthly_donations: number
  pending_pledges: number
  prayer_requests: number
  upcoming_birthdays: number
  upcoming_anniversaries: number
  groups_count: number
  recent_visitors: number
  attendance_rate: number
  visitor_conversion_rate: number
}

export interface Demographics {
  gender: { male: number; female: number }
  ageGroups: { [key: string]: number }
  maritalStatus: { [key: string]: number }
  groups: { [key: string]: number }
}

export interface AttendanceStats {
  service_date: string
  service_type: ServiceType
  total_attendance: number
  member_attendance: number
  dependant_attendance: number
}

// Offline sync types
export interface OfflineQueueItem {
  id: string
  client_uuid: string
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  data: Record<string, any>
  created_at: string
  retry_count: number
}

// SMS types
export interface SMSProvider {
  name: string
  sendSMS: (phone: string, message: string) => Promise<boolean>
  sendOTP: (phone: string, otp: string) => Promise<boolean>
}

export interface SMSConfig {
  provider: 'twilio' | 'africas_talking' | 'custom'
  api_key: string
  api_secret: string
  from_number?: string
  sender_id?: string
}

// Export types
export interface ExportConfig {
  format: 'csv' | 'xlsx' | 'pdf'
  filters?: Record<string, any>
  fields?: string[]
  include_dependants?: boolean
}

export interface ExportJob {
  id: string
  type: string
  config: ExportConfig
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_url?: string
  created_at: string
  completed_at?: string
  error_message?: string
}
