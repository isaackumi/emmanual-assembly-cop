/**
 * Setup Test User Script
 * Creates a test user for development
 */

import { setTestUser, TestUser } from '../lib/auth-utils'

// Create a test user
const testUser: TestUser = {
  id: '5f958b2d-d241-4895-9381-c2b5ab8a7f31', // Use the admin user ID from the database
  full_name: 'System Administrator',
  role: 'admin',
  phone: '+233548769251',
  auth_uid: '36cdaf38-a853-45a9-93c8-19bc9e207ec9'
}

// Set the test user
setTestUser(testUser)

console.log('✅ Test user set up successfully!')
console.log('User:', testUser)
console.log('You can now access the application with admin privileges.')
