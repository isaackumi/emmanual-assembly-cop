/**
 * Simple authentication utilities for testing
 * This bypasses Supabase auth for development/testing purposes
 */

export interface TestUser {
  id: string
  full_name: string
  role: string
  phone: string
  auth_uid: string
}

const TEST_USER_KEY = 'emmanuel_assembly_test_user'

export function setTestUser(user: TestUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TEST_USER_KEY, JSON.stringify(user))
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('testUserChanged', { detail: user }))
  }
}

export function getTestUser(): TestUser | null {
  if (typeof window === 'undefined') return null
  
  try {
    const userStr = localStorage.getItem(TEST_USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

export function clearTestUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TEST_USER_KEY)
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('testUserChanged', { detail: null }))
  }
}

export function isTestMode(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(TEST_USER_KEY) !== null
}
