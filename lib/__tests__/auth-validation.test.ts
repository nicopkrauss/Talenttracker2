import { describe, it, expect } from 'vitest'
import { 
  registrationSchema, 
  loginSchema, 
  validatePasswordStrength,
  type RegistrationInput,
  type LoginInput 
} from '../types'

describe('Authentication Validation', () => {
  describe('registrationSchema', () => {
    const validRegistrationData: RegistrationInput = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'StrongPassword123!',
      phone: '(555) 123-4567',
      city: 'New York',
      state: 'NY',
      agreeToTerms: true,
    }

    it('validates valid registration data', () => {
      const result = registrationSchema.safeParse(validRegistrationData)
      expect(result.success).toBe(true)
    })

    describe('firstName validation', () => {
      it('rejects empty first name', () => {
        const data = { ...validRegistrationData, firstName: '' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('First name is required')
        }
      })

      it('rejects first name with numbers', () => {
        const data = { ...validRegistrationData, firstName: 'John123' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('can only contain letters')
        }
      })

      it('accepts first name with hyphens and apostrophes', () => {
        const data = { ...validRegistrationData, firstName: "Mary-Jane O'Connor" }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      it('rejects first name longer than 50 characters', () => {
        const data = { ...validRegistrationData, firstName: 'a'.repeat(51) }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    describe('lastName validation', () => {
      it('rejects empty last name', () => {
        const data = { ...validRegistrationData, lastName: '' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Last name is required')
        }
      })

      it('accepts last name with hyphens and apostrophes', () => {
        const data = { ...validRegistrationData, lastName: "Smith-Jones" }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    describe('email validation', () => {
      it('rejects invalid email format', () => {
        const data = { ...validRegistrationData, email: 'invalid-email' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Please enter a valid email address')
        }
      })

      it('converts email to lowercase', () => {
        const data = { ...validRegistrationData, email: 'JOHN@EXAMPLE.COM' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.email).toBe('john@example.com')
        }
      })

      it('rejects email longer than 254 characters', () => {
        const longEmail = 'a'.repeat(250) + '@example.com'
        const data = { ...validRegistrationData, email: longEmail }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    describe('password validation', () => {
      it('rejects password shorter than 8 characters', () => {
        const data = { ...validRegistrationData, password: 'Short1!' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
        }
      })

      it('rejects password longer than 128 characters', () => {
        const data = { ...validRegistrationData, password: 'a'.repeat(129) }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
      })

      it('rejects weak passwords', () => {
        const data = { ...validRegistrationData, password: 'weakpassword' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('must contain at least 3 of')
        }
      })

      it('accepts strong passwords', () => {
        const strongPasswords = [
          'StrongPassword123!',
          'MyP@ssw0rd',
          'Complex123$',
          'Secure!Pass1'
        ]

        strongPasswords.forEach(password => {
          const data = { ...validRegistrationData, password }
          const result = registrationSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })
    })

    describe('phone validation', () => {
      it('accepts various phone formats', () => {
        const validPhones = [
          '(555) 123-4567',
          '555-123-4567',
          '555 123 4567',
          '5551234567',
          '+1 (555) 123-4567'
        ]

        validPhones.forEach(phone => {
          const data = { ...validRegistrationData, phone }
          const result = registrationSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('normalizes phone number format', () => {
        const data = { ...validRegistrationData, phone: '5551234567' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.phone).toBe('(555) 123-4567')
        }
      })

      it('rejects invalid phone numbers', () => {
        const invalidPhones = [
          '123',
          '555-123',
          'not-a-phone',
          '555-123-456789'
        ]

        invalidPhones.forEach(phone => {
          const data = { ...validRegistrationData, phone }
          const result = registrationSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })
    })

    describe('city validation', () => {
      it('rejects empty city', () => {
        const data = { ...validRegistrationData, city: '' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
      })

      it('accepts city with spaces and hyphens', () => {
        const data = { ...validRegistrationData, city: 'New York' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      it('rejects city with numbers', () => {
        const data = { ...validRegistrationData, city: 'City123' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    describe('state validation', () => {
      it('rejects state shorter than 2 characters', () => {
        const data = { ...validRegistrationData, state: 'N' }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
      })

      it('accepts state abbreviations and full names', () => {
        const validStates = ['NY', 'California', 'TX', 'New York']
        
        validStates.forEach(state => {
          const data = { ...validRegistrationData, state }
          const result = registrationSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })
    })

    describe('terms agreement validation', () => {
      it('requires terms agreement to be true', () => {
        const data = { ...validRegistrationData, agreeToTerms: false }
        const result = registrationSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('must agree to the Terms')
        }
      })
    })
  })

  describe('loginSchema', () => {
    const validLoginData: LoginInput = {
      email: 'john@example.com',
      password: 'password123',
    }

    it('validates valid login data', () => {
      const result = loginSchema.safeParse(validLoginData)
      expect(result.success).toBe(true)
    })

    it('rejects empty email', () => {
      const data = { ...validLoginData, email: '' }
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required')
      }
    })

    it('rejects invalid email format', () => {
      const data = { ...validLoginData, email: 'invalid-email' }
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects empty password', () => {
      const data = { ...validLoginData, password: '' }
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required')
      }
    })

    it('converts email to lowercase', () => {
      const data = { ...validLoginData, email: 'JOHN@EXAMPLE.COM' }
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('john@example.com')
      }
    })
  })

  describe('validatePasswordStrength', () => {
    it('correctly identifies weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'abcdefgh',
        'PASSWORD'
      ]

      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.strength).toBe('weak')
        expect(result.score).toBeLessThan(3)
      })
    })

    it('correctly identifies medium passwords', () => {
      const mediumPasswords = [
        'password1', // lowercase + number + length = 3
        'PASSWORD1', // uppercase + number + length = 3  
        'Passwordd' // uppercase + lowercase + length = 3
      ]

      mediumPasswords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.strength).toBe('medium')
        expect(result.score).toBe(3)
      })
    })

    it('correctly identifies strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyP@ssw0rd',
        'Str0ng!Pass',
        'Complex$123'
      ]

      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.strength).toBe('strong')
        expect(result.score).toBeGreaterThanOrEqual(4)
      })
    })

    it('provides detailed check results', () => {
      const password = 'Password123!'
      const result = validatePasswordStrength(password)
      
      expect(result.checks.length).toBe(true)
      expect(result.checks.lowercase).toBe(true)
      expect(result.checks.uppercase).toBe(true)
      expect(result.checks.number).toBe(true)
      expect(result.checks.special).toBe(true)
    })

    it('handles edge cases', () => {
      // Empty password
      const emptyResult = validatePasswordStrength('')
      expect(emptyResult.strength).toBe('weak')
      expect(emptyResult.score).toBe(0)

      // Very short password
      const shortResult = validatePasswordStrength('P1!')
      expect(shortResult.checks.length).toBe(false)
      expect(shortResult.score).toBe(3) // Has upper, number, special but not length
    })
  })
})