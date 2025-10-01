import { 
  normalizeMembershipId, 
  isValidMembershipId, 
  formatMembershipIdForDisplay,
  generateMembershipId,
  membershipIdsEqual 
} from '../lib/membershipId'

describe('Membership ID Utils', () => {
  describe('normalizeMembershipId', () => {
    it('should normalize membership IDs correctly', () => {
      expect(normalizeMembershipId('EA-1234-2021')).toBe('EA12342021')
      expect(normalizeMembershipId('ea-1234-2021')).toBe('EA12342021')
      expect(normalizeMembershipId('EA 1234 2021')).toBe('EA12342021')
      expect(normalizeMembershipId('EA.1234.2021')).toBe('EA12342021')
      expect(normalizeMembershipId('EA12342021')).toBe('EA12342021')
    })

    it('should handle empty strings', () => {
      expect(normalizeMembershipId('')).toBe('')
      expect(normalizeMembershipId('   ')).toBe('')
    })
  })

  describe('isValidMembershipId', () => {
    it('should validate correct membership IDs', () => {
      expect(isValidMembershipId('EA12342021')).toBe(true)
      expect(isValidMembershipId('EA00012024')).toBe(true)
      expect(isValidMembershipId('EA99992020')).toBe(true)
    })

    it('should reject invalid membership IDs', () => {
      expect(isValidMembershipId('EA1234')).toBe(false)
      expect(isValidMembershipId('EA1234202')).toBe(false)
      expect(isValidMembershipId('EA123420211')).toBe(false)
      expect(isValidMembershipId('AB12342021')).toBe(false)
      expect(isValidMembershipId('ea12342021')).toBe(true)
      expect(isValidMembershipId('1234567890')).toBe(false)
    })
  })

  describe('formatMembershipIdForDisplay', () => {
    it('should format membership IDs for display', () => {
      expect(formatMembershipIdForDisplay('EA12342021')).toBe('EA-1234-2021')
      expect(formatMembershipIdForDisplay('EA00012024')).toBe('EA-0001-2024')
    })

    it('should handle invalid IDs', () => {
      expect(formatMembershipIdForDisplay('invalid')).toBe('invalid')
      expect(formatMembershipIdForDisplay('EA1234')).toBe('EA1234')
    })
  })

  describe('generateMembershipId', () => {
    it('should generate membership IDs with phone', () => {
      const id = generateMembershipId('+233241234567', 2021)
      expect(id).toMatch(/^EA-\d{4}-2021$/)
    })

    it('should generate membership IDs without phone', () => {
      const id = generateMembershipId(undefined, 2021)
      expect(id).toMatch(/^EA-\d{4}-2021$/)
    })

    it('should use current year by default', () => {
      const currentYear = new Date().getFullYear()
      const id = generateMembershipId()
      expect(id).toMatch(new RegExp(`^EA-\\d{4}-${currentYear}$`))
    })
  })

  describe('membershipIdsEqual', () => {
    it('should compare membership IDs correctly', () => {
      expect(membershipIdsEqual('EA-1234-2021', 'EA12342021')).toBe(true)
      expect(membershipIdsEqual('EA-1234-2021', 'EA-1234-2021')).toBe(true)
      expect(membershipIdsEqual('EA12342021', 'EA12342021')).toBe(true)
      expect(membershipIdsEqual('EA-1234-2021', 'EA-5678-2021')).toBe(false)
    })
  })
})
