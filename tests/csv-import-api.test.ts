import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
  }))
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        in: vi.fn(),
        insert: vi.fn(() => ({
          select: vi.fn()
        }))
      }))
    }))
  }))
}))

describe('CSV Import API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Bulk Import Validation Schema', () => {
    it('should validate bulk import request structure', async () => {
      const { z } = await import('zod')
      const { talentProfileSchema } = await import('../lib/types')
      
      const bulkImportSchema = z.object({
        talent: z.array(talentProfileSchema).min(1, 'At least one talent record is required')
      })

      const validRequest = {
        talent: [
          {
            first_name: 'John',
            last_name: 'Doe',
            rep_name: 'Jane Smith',
            rep_email: 'jane.smith@agency.com',
            rep_phone: '(555) 123-4567',
            notes: 'Test talent'
          }
        ]
      }

      const result = bulkImportSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject empty talent array', async () => {
      const { z } = await import('zod')
      const { talentProfileSchema } = await import('../lib/types')
      
      const bulkImportSchema = z.object({
        talent: z.array(talentProfileSchema).min(1, 'At least one talent record is required')
      })

      const invalidRequest = {
        talent: []
      }

      const result = bulkImportSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const error = result.error.errors.find(err => err.path[0] === 'talent')
        expect(error?.message).toContain('At least one talent record is required')
      }
    })

    it('should validate individual talent records in bulk import', async () => {
      const { z } = await import('zod')
      const { talentProfileSchema } = await import('../lib/types')
      
      const bulkImportSchema = z.object({
        talent: z.array(talentProfileSchema).min(1, 'At least one talent record is required')
      })

      const requestWithInvalidTalent = {
        talent: [
          {
            first_name: 'John',
            last_name: 'Doe',
            rep_name: 'Jane Smith',
            rep_email: 'jane.smith@agency.com',
            rep_phone: '(555) 123-4567'
          },
          {
            first_name: '', // Invalid - empty
            last_name: 'Smith',
            rep_name: 'Bob Johnson',
            rep_email: 'invalid-email', // Invalid email
            rep_phone: '123' // Invalid phone
          }
        ]
      }

      const result = bulkImportSchema.safeParse(requestWithInvalidTalent)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        // Should have errors for the second talent record
        const errors = result.error.errors
        expect(errors.length).toBeGreaterThan(0)
        
        // Check for specific field errors in the second record
        const firstNameError = errors.find(err => 
          err.path[0] === 'talent' && err.path[1] === 1 && err.path[2] === 'first_name'
        )
        const emailError = errors.find(err => 
          err.path[0] === 'talent' && err.path[1] === 1 && err.path[2] === 'rep_email'
        )
        const phoneError = errors.find(err => 
          err.path[0] === 'talent' && err.path[1] === 1 && err.path[2] === 'rep_phone'
        )
        
        expect(firstNameError).toBeDefined()
        expect(emailError).toBeDefined()
        expect(phoneError).toBeDefined()
      }
    })
  })

  describe('Duplicate Detection Logic', () => {
    it('should detect duplicate emails within import batch', () => {
      const talentRecords = [
        {
          first_name: 'John',
          last_name: 'Doe',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com',
          rep_phone: '(555) 123-4567'
        },
        {
          first_name: 'Bob',
          last_name: 'Johnson',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com', // Duplicate email
          rep_phone: '(555) 987-6543'
        }
      ]

      const emails = talentRecords.map(t => t.rep_email.toLowerCase())
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
      
      expect(duplicateEmails).toHaveLength(1)
      expect(duplicateEmails[0]).toBe('jane.smith@agency.com')
    })

    it('should not detect duplicates when all emails are unique', () => {
      const talentRecords = [
        {
          first_name: 'John',
          last_name: 'Doe',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com',
          rep_phone: '(555) 123-4567'
        },
        {
          first_name: 'Bob',
          last_name: 'Johnson',
          rep_name: 'Alice Brown',
          rep_email: 'alice.brown@agency.com',
          rep_phone: '(555) 987-6543'
        }
      ]

      const emails = talentRecords.map(t => t.rep_email.toLowerCase())
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
      
      expect(duplicateEmails).toHaveLength(0)
    })

    it('should handle case-insensitive email comparison', () => {
      const talentRecords = [
        {
          first_name: 'John',
          last_name: 'Doe',
          rep_name: 'Jane Smith',
          rep_email: 'Jane.Smith@Agency.com',
          rep_phone: '(555) 123-4567'
        },
        {
          first_name: 'Bob',
          last_name: 'Johnson',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com', // Same email, different case
          rep_phone: '(555) 987-6543'
        }
      ]

      const emails = talentRecords.map(t => t.rep_email.toLowerCase())
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
      
      expect(duplicateEmails).toHaveLength(1)
      expect(duplicateEmails[0]).toBe('jane.smith@agency.com')
    })
  })

  describe('Data Transformation', () => {
    it('should transform talent records for database insertion', () => {
      const talentRecords = [
        {
          first_name: 'John',
          last_name: 'Doe',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com',
          rep_phone: '(555) 123-4567',
          notes: 'Test notes'
        }
      ]

      const talentInserts = talentRecords.map(talent => ({
        first_name: talent.first_name,
        last_name: talent.last_name,
        rep_name: talent.rep_name,
        rep_email: talent.rep_email,
        rep_phone: talent.rep_phone,
        notes: talent.notes || null,
        contact_info: {}
      }))

      expect(talentInserts).toHaveLength(1)
      expect(talentInserts[0]).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        rep_name: 'Jane Smith',
        rep_email: 'jane.smith@agency.com',
        rep_phone: '(555) 123-4567',
        notes: 'Test notes',
        contact_info: {}
      })
    })

    it('should handle missing notes field', () => {
      const talentRecords = [
        {
          first_name: 'John',
          last_name: 'Doe',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com',
          rep_phone: '(555) 123-4567'
          // No notes field
        }
      ]

      const talentInserts = talentRecords.map(talent => ({
        first_name: talent.first_name,
        last_name: talent.last_name,
        rep_name: talent.rep_name,
        rep_email: talent.rep_email,
        rep_phone: talent.rep_phone,
        notes: talent.notes || null,
        contact_info: {}
      }))

      expect(talentInserts[0].notes).toBeNull()
    })
  })
})