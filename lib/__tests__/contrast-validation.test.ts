import { describe, it, expect } from 'vitest'
import {
  calculateContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  validateElementContrast,
  toHaveAccessibleContrast
} from './contrast-validation'

// Extend Vitest matchers
expect.extend({
  toHaveAccessibleContrast
})

describe('Contrast Validation', () => {
  describe('calculateContrastRatio', () => {
    it('should calculate correct contrast ratio for white and black', () => {
      const ratio = calculateContrastRatio('#ffffff', '#000000')
      expect(ratio).toBeCloseTo(21, 1)
    })

    it('should calculate correct contrast ratio for gray colors', () => {
      const ratio = calculateContrastRatio('#ffffff', '#767676')
      expect(ratio).toBeGreaterThan(4.5)
    })

    it('should handle rgb color format', () => {
      const ratio = calculateContrastRatio('rgb(255, 255, 255)', 'rgb(0, 0, 0)')
      expect(ratio).toBeCloseTo(21, 1)
    })

    it('should handle rgba color format', () => {
      const ratio = calculateContrastRatio('rgba(255, 255, 255, 1)', 'rgba(0, 0, 0, 1)')
      expect(ratio).toBeCloseTo(21, 1)
    })

    it('should handle named colors', () => {
      const ratio = calculateContrastRatio('white', 'black')
      expect(ratio).toBeCloseTo(21, 1)
    })
  })

  describe('WCAG AA compliance', () => {
    it('should validate AA compliance for normal text', () => {
      expect(meetsWCAGAA(4.5)).toBe(true)
      expect(meetsWCAGAA(4.4)).toBe(false)
    })

    it('should validate AA compliance for large text', () => {
      expect(meetsWCAGAA(3.0, true)).toBe(true)
      expect(meetsWCAGAA(2.9, true)).toBe(false)
    })
  })

  describe('WCAG AAA compliance', () => {
    it('should validate AAA compliance for normal text', () => {
      expect(meetsWCAGAAA(7.0)).toBe(true)
      expect(meetsWCAGAAA(6.9)).toBe(false)
    })

    it('should validate AAA compliance for large text', () => {
      expect(meetsWCAGAAA(4.5, true)).toBe(true)
      expect(meetsWCAGAAA(4.4, true)).toBe(false)
    })
  })

  describe('validateElementContrast', () => {
    it('should validate element with good contrast', () => {
      // Create a mock element with high contrast
      const element = document.createElement('div')
      element.style.color = 'black'
      element.style.backgroundColor = 'white'
      element.style.fontSize = '16px'
      document.body.appendChild(element)

      const validation = validateElementContrast(element)
      
      expect(validation.contrastRatio).toBeGreaterThan(0)
      expect(validation.textColor).toBeDefined()
      expect(validation.backgroundColor).toBeDefined()
      expect(validation.isLargeText).toBe(false)

      document.body.removeChild(element)
    })

    it('should detect large text correctly', () => {
      const element = document.createElement('div')
      element.style.color = 'black'
      element.style.backgroundColor = 'white'
      element.style.fontSize = '20px'
      document.body.appendChild(element)

      const validation = validateElementContrast(element)
      expect(validation.isLargeText).toBe(true)

      document.body.removeChild(element)
    })

    it('should detect bold large text correctly', () => {
      const element = document.createElement('div')
      element.style.color = 'black'
      element.style.backgroundColor = 'white'
      element.style.fontSize = '16px'
      element.style.fontWeight = 'bold'
      document.body.appendChild(element)

      const validation = validateElementContrast(element)
      expect(validation.isLargeText).toBe(true)

      document.body.removeChild(element)
    })
  })
})