import { describe, it, expect, vi, beforeEach } from 'vitest'
import { talentProfileSchema } from '../lib/types'

// Mock Papa Parse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
    unparse: vi.fn()
  }
}))

describe('CSV Import Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Talent Profile Validation', () => {
    it('should validate correct talent data', () => {
      const validTalent = {
        first_name: 'John',
        last_name: 'Doe',
        rep_name: 'Jane Smith',
        rep_email: 'jane.smith@agency.com',
        rep_phone: '(555) 123-4567',
        notes: 'Test notes'
      }

      const result = talentProfileSchema.safeParse(validTalent)
      expect(result.success).toBe(true)
    })

    it('should reject talent data with missing required fields', () => {
      const invalidTalent = {
        first_name: 'John',
        // Missing last_name, rep_name, rep_email, rep_phone
      }

      const result = talentProfileSchema.safeParse(invalidTalent)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const errors = result.error.errors.map(err => err.path[0])
        expect(errors).toContain('last_name')
        expect(errors).toContain('rep_name')
        expect(errors).toContain('rep_email')
        expect(errors).toContain('rep_phone')
      }
    })

    it('should reject invalid email format', () => {
      const invalidTalent = {
        first_name: 'John',
        last_name: 'Doe',
        rep_name: 'Jane Smith',
        rep_email: 'invalid-email',
        rep_phone: '(555) 123-4567'
      }

      const result = talentProfileSchema.safeParse(invalidTalent)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const emailError = result.error.errors.find(err => err.path[0] === 'rep_email')
        expect(emailError).toBeDefined()
        expect(emailError?.message).toContain('email')
      }
    })

    it('should reject invalid phone format', () => {
      const invalidTalent = {
        first_name: 'John',
        last_name: 'Doe',
        rep_name: 'Jane Smith',
        rep_email: 'jane.smith@agency.com',
        rep_phone: '123' // Invalid phone format
      }

      const result = talentProfileSchema.safeParse(invalidTalent)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const phoneError = result.error.errors.find(err => err.path[0] === 'rep_phone')
        expect(phoneError).toBeDefined()
        expect(phoneError?.message).toContain('phone')
      }
    })

    it('should accept valid phone number formats', () => {
      const phoneFormats = [
        '(555) 123-4567',
        '555-123-4567',
        '555 123 4567',
        '5551234567',
        '+1 (555) 123-4567'
      ]

      phoneFormats.forEach(phone => {
        const talentData = {
          first_name: 'John',
          last_name: 'Doe',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com',
          rep_phone: phone
        }

        const result = talentProfileSchema.safeParse(talentData)
        expect(result.success).toBe(true)
      })
    })

    it('should handle optional notes field', () => {
      const talentWithoutNotes = {
        first_name: 'John',
        last_name: 'Doe',
        rep_name: 'Jane Smith',
        rep_email: 'jane.smith@agency.com',
        rep_phone: '(555) 123-4567'
      }

      const talentWithNotes = {
        ...talentWithoutNotes,
        notes: 'Some notes about the talent'
      }

      const resultWithoutNotes = talentProfileSchema.safeParse(talentWithoutNotes)
      const resultWithNotes = talentProfileSchema.safeParse(talentWithNotes)

      expect(resultWithoutNotes.success).toBe(true)
      expect(resultWithNotes.success).toBe(true)
    })

    it('should reject notes that are too long', () => {
      const longNotes = 'a'.repeat(1001) // Exceeds 1000 character limit

      const talentData = {
        first_name: 'John',
        last_name: 'Doe',
        rep_name: 'Jane Smith',
        rep_email: 'jane.smith@agency.com',
        rep_phone: '(555) 123-4567',
        notes: longNotes
      }

      const result = talentProfileSchema.safeParse(talentData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const notesError = result.error.errors.find(err => err.path[0] === 'notes')
        expect(notesError).toBeDefined()
        expect(notesError?.message).toContain('1000')
      }
    })
  })

  describe('CSV Data Processing', () => {
    it('should handle empty CSV data', () => {
      const csvData: any[] = []
      const columnMapping = {
        first_name: 'First Name',
        last_name: 'Last Name',
        rep_name: 'Rep Name',
        rep_email: 'Rep Email',
        rep_phone: 'Rep Phone'
      }

      // Simulate processing empty data
      const processed = csvData.map((row, index) => {
        const talentData: any = {}
        Object.entries(columnMapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn] !== undefined) {
            talentData[field] = row[csvColumn]?.trim() || ''
          }
        })

        const validation = talentProfileSchema.safeParse(talentData)
        return {
          ...talentData,
          rowIndex: index + 2,
          errors: validation.success ? undefined : validation.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          )
        }
      })

      expect(processed).toHaveLength(0)
    })

    it('should process valid CSV data correctly', () => {
      const csvData = [
        {
          'First Name': 'John',
          'Last Name': 'Doe',
          'Rep Name': 'Jane Smith',
          'Rep Email': 'jane.smith@agency.com',
          'Rep Phone': '(555) 123-4567',
          'Notes': 'Test talent'
        }
      ]

      const columnMapping = {
        first_name: 'First Name',
        last_name: 'Last Name',
        rep_name: 'Rep Name',
        rep_email: 'Rep Email',
        rep_phone: 'Rep Phone',
        notes: 'Notes'
      }

      const processed = csvData.map((row, index) => {
        const talentData: any = {}
        Object.entries(columnMapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn] !== undefined) {
            talentData[field] = row[csvColumn]?.trim() || ''
          }
        })

        const validation = talentProfileSchema.safeParse(talentData)
        return {
          ...talentData,
          rowIndex: index + 2,
          errors: validation.success ? undefined : validation.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          )
        }
      })

      expect(processed).toHaveLength(1)
      expect(processed[0].errors).toBeUndefined()
      expect(processed[0].first_name).toBe('John')
      expect(processed[0].last_name).toBe('Doe')
      expect(processed[0].rep_name).toBe('Jane Smith')
      expect(processed[0].rep_email).toBe('jane.smith@agency.com')
      expect(processed[0].rep_phone).toBe('(555) 123-4567')
      expect(processed[0].notes).toBe('Test talent')
    })

    it('should handle mixed valid and invalid data', () => {
      const csvData = [
        {
          'First Name': 'John',
          'Last Name': 'Doe',
          'Rep Name': 'Jane Smith',
          'Rep Email': 'jane.smith@agency.com',
          'Rep Phone': '(555) 123-4567'
        },
        {
          'First Name': '', // Invalid - empty
          'Last Name': 'Smith',
          'Rep Name': 'Bob Johnson',
          'Rep Email': 'invalid-email', // Invalid email
          'Rep Phone': '123' // Invalid phone
        }
      ]

      const columnMapping = {
        first_name: 'First Name',
        last_name: 'Last Name',
        rep_name: 'Rep Name',
        rep_email: 'Rep Email',
        rep_phone: 'Rep Phone'
      }

      const processed = csvData.map((row, index) => {
        const talentData: any = {}
        Object.entries(columnMapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn] !== undefined) {
            talentData[field] = row[csvColumn]?.trim() || ''
          }
        })

        const validation = talentProfileSchema.safeParse(talentData)
        return {
          ...talentData,
          rowIndex: index + 2,
          errors: validation.success ? undefined : validation.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          )
        }
      })

      expect(processed).toHaveLength(2)
      expect(processed[0].errors).toBeUndefined() // First record is valid
      expect(processed[1].errors).toBeDefined() // Second record has errors
      expect(processed[1].errors?.length).toBeGreaterThan(0)
    })
  })
})