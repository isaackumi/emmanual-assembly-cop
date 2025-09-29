/**
 * Frontend-based profile completion calculation
 * This eliminates the need for database triggers and prevents recursion
 */

import { AppUser, Member } from './types'

export interface ProfileCompletionData {
  percentage: number
  completed: number
  total: number
  details: {
    personal: { completed: number; total: number }
    contact: { completed: number; total: number }
    professional: { completed: number; total: number }
    family: { completed: number; total: number }
    spiritual: { completed: number; total: number }
    additional: { completed: number; total: number }
  }
}

export function calculateProfileCompletion(user: AppUser, member?: Member): ProfileCompletionData {
  const details = {
    personal: { completed: 0, total: 5 },
    contact: { completed: 0, total: 3 },
    professional: { completed: 0, total: 2 },
    family: { completed: 0, total: 3 },
    spiritual: { completed: 0, total: 4 },
    additional: { completed: 0, total: 3 }
  }

  // Personal Information (5 fields)
  if (user.first_name && user.first_name.trim() !== '') details.personal.completed++
  if (user.last_name && user.last_name.trim() !== '') details.personal.completed++
  if (user.phone && user.phone.trim() !== '') details.personal.completed++
  if (user.email && user.email.trim() !== '') details.personal.completed++
  if (member?.gender && member.gender.trim() !== '') details.personal.completed++

  // Contact & Location (3 fields)
  if (member?.address && member.address.trim() !== '') details.contact.completed++
  if (user.secondary_phone && user.secondary_phone.trim() !== '') details.contact.completed++
  if (user.emergency_contact_phone && user.emergency_contact_phone.trim() !== '') details.contact.completed++

  // Professional Information (2 fields)
  if (user.occupation && user.occupation.trim() !== '') details.professional.completed++
  if (user.place_of_work && user.place_of_work.trim() !== '') details.professional.completed++

  // Family Information (3 fields)
  if (user.marital_status && user.marital_status.trim() !== '') details.family.completed++
  if (user.spouse_name && user.spouse_name.trim() !== '') details.family.completed++
  if (user.children_count !== null && user.children_count !== undefined) details.family.completed++

  // Spiritual Information (4 fields)
  if (member?.dob) details.spiritual.completed++
  if (member?.date_of_baptism) details.spiritual.completed++
  if (member?.holy_ghost_baptism !== null && member?.holy_ghost_baptism !== undefined) details.spiritual.completed++
  if (member?.date_of_holy_ghost_baptism) details.spiritual.completed++

  // Additional Information (3 fields)
  if (member?.profile_photo_url && member.profile_photo_url.trim() !== '') details.additional.completed++
  if (member?.special_skills && Array.isArray(member.special_skills) && member.special_skills.length > 0) details.additional.completed++
  if (member?.interests && Array.isArray(member.interests) && member.interests.length > 0) details.additional.completed++

  // Calculate totals
  const completed = Object.values(details).reduce((sum, section) => sum + section.completed, 0)
  const total = Object.values(details).reduce((sum, section) => sum + section.total, 0)
  const percentage = Math.round((completed / total) * 100)

  return {
    percentage,
    completed,
    total,
    details
  }
}

export function getCompletionColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600'
  if (percentage >= 60) return 'text-yellow-600'
  if (percentage >= 40) return 'text-orange-600'
  return 'text-red-600'
}

export function getCompletionMessage(percentage: number): string {
  if (percentage >= 90) return 'Profile is almost complete!'
  if (percentage >= 70) return 'Great progress! Keep going!'
  if (percentage >= 50) return 'Halfway there!'
  if (percentage >= 25) return 'Getting started!'
  return 'Complete your profile to get the most out of the system!'
}

export function getNextSteps(completionData: ProfileCompletionData): string[] {
  const steps: string[] = []

  // Personal Information
  if (completionData.details.personal.completed < completionData.details.personal.total) {
    if (completionData.details.personal.completed < 2) steps.push('Add your first and last name')
    if (completionData.details.personal.completed < 3) steps.push('Add your phone number')
    if (completionData.details.personal.completed < 4) steps.push('Add your email address')
    if (completionData.details.personal.completed < 5) steps.push('Select your gender')
  }

  // Contact Information
  if (completionData.details.contact.completed < completionData.details.contact.total) {
    if (completionData.details.contact.completed < 1) steps.push('Add your address')
    if (completionData.details.contact.completed < 2) steps.push('Add a secondary phone number')
    if (completionData.details.contact.completed < 3) steps.push('Add an emergency contact')
  }

  // Professional Information
  if (completionData.details.professional.completed < completionData.details.professional.total) {
    if (completionData.details.professional.completed < 1) steps.push('Add your occupation')
    if (completionData.details.professional.completed < 2) steps.push('Add your place of work')
  }

  // Family Information
  if (completionData.details.family.completed < completionData.details.family.total) {
    if (completionData.details.family.completed < 1) steps.push('Select your marital status')
    if (completionData.details.family.completed < 2) steps.push('Add your spouse name (if applicable)')
    if (completionData.details.family.completed < 3) steps.push('Add number of children')
  }

  // Spiritual Information
  if (completionData.details.spiritual.completed < completionData.details.spiritual.total) {
    if (completionData.details.spiritual.completed < 1) steps.push('Add your date of birth')
    if (completionData.details.spiritual.completed < 2) steps.push('Add your baptism date')
    if (completionData.details.spiritual.completed < 3) steps.push('Indicate Holy Ghost baptism status')
    if (completionData.details.spiritual.completed < 4) steps.push('Add Holy Ghost baptism date')
  }

  // Additional Information
  if (completionData.details.additional.completed < completionData.details.additional.total) {
    if (completionData.details.additional.completed < 1) steps.push('Upload a profile photo')
    if (completionData.details.additional.completed < 2) steps.push('Add your special skills')
    if (completionData.details.additional.completed < 3) steps.push('Add your interests')
  }

  return steps.slice(0, 3) // Return top 3 next steps
}
