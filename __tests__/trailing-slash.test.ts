/**
 * Trailing Slash Route Tests
 * Tests to ensure trailing slash redirects work properly
 */

import { describe, it, expect } from '@jest/globals'

const BASE_URL = 'http://localhost:3000'

describe('Trailing Slash Redirect Tests', () => {
  const routes = [
    '/visitors',
    '/members', 
    '/groups',
    '/attendance',
    '/celebrations',
    '/sms'
  ]

  routes.forEach(route => {
    it(`should redirect ${route}/ to ${route}`, async () => {
      try {
        const response = await fetch(`${BASE_URL}${route}/`, {
          method: 'GET',
          redirect: 'manual' // Don't follow redirects automatically
        })
        
        // Should return 301 or 308 redirect
        expect([301, 308]).toContain(response.status)
        
        // Check if Location header is set correctly
        const location = response.headers.get('location')
        if (location) {
          expect(location).toContain(route)
          expect(location).not.toContain(route + '/')
        }
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log(`Skipping ${route} - server not running`)
          return
        }
        throw error
      }
    })
    
    it(`should serve ${route} without redirect`, async () => {
      try {
        const response = await fetch(`${BASE_URL}${route}`, {
          method: 'GET',
          redirect: 'manual'
        })
        
        // Should return 200 without redirect
        expect(response.status).toBe(200)
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log(`Skipping ${route} - server not running`)
          return
        }
        throw error
      }
    })
  })
  
  it('should handle root redirect properly', async () => {
    try {
      const response = await fetch(`${BASE_URL}/`, {
        method: 'GET',
        redirect: 'manual'
      })
      
      // Should either be 200 (if not authenticated) or 302/301 (if redirecting)
      expect([200, 301, 302]).toContain(response.status)
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Skipping root redirect test - server not running')
        return
      }
      throw error
    }
  })
})
