interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class Cache {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear expired items
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    this.cache.forEach((item) => {
      if (now - item.timestamp > item.ttl) {
        expired++
      } else {
        active++
      }
    })

    return {
      total: this.cache.size,
      active,
      expired
    }
  }
}

// Create singleton instance
export const cache = new Cache()

// Cache key generators
export const cacheKeys = {
  // Dashboard
  dashboardStats: () => 'dashboard:stats',
  
  // Members
  members: (page: number, limit: number, search?: string, filter?: string) => 
    `members:${page}:${limit}:${search || ''}:${filter || ''}`,
  member: (id: string) => `member:${id}`,
  
  // Groups
  groups: (page: number, limit: number, search?: string, type?: string) => 
    `groups:${page}:${limit}:${search || ''}:${type || ''}`,
  group: (id: string) => `group:${id}`,
  groupMembers: (groupId: string) => `group:${groupId}:members`,
  
  // Attendance
  attendanceHistory: (memberId?: string, limit?: number) => 
    `attendance:${memberId || 'all'}:${limit || 50}`,
  
  // Visitors
  visitors: (page: number, limit: number, search?: string) => 
    `visitors:${page}:${limit}:${search || ''}`,
  
  // Upcoming Events
  upcomingEvents: () => 'events:upcoming',
  
  // All Members (for dropdowns)
  allMembers: () => 'members:all'
}

// Cache TTL constants (in milliseconds)
export const cacheTTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
  STATIC: 24 * 60 * 60 * 1000 // 24 hours
}

// Utility functions
export function invalidateCache(pattern: string): void {
  const keysToDelete: string[] = []
  
  cache['cache'].forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => cache.delete(key))
}

export function invalidateMemberCache(): void {
  invalidateCache('member')
  invalidateCache('members')
  invalidateCache('dashboard')
  invalidateCache('events')
}

export function invalidateGroupCache(): void {
  invalidateCache('group')
  invalidateCache('groups')
  invalidateCache('dashboard')
}

export function invalidateAttendanceCache(): void {
  invalidateCache('attendance')
  invalidateCache('dashboard')
}

export function invalidateVisitorCache(): void {
  invalidateCache('visitor')
  invalidateCache('visitors')
  invalidateCache('dashboard')
}

// Auto cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup()
  }, 10 * 60 * 1000)
}

export default cache
