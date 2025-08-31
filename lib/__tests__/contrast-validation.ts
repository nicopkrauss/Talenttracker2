// Contrast ratio validation utilities for theme testing

/**
 * Convert RGB color to relative luminance
 * Based on WCAG 2.1 guidelines
 */
function getRGBFromString(colorString: string): [number, number, number] {
  // Handle rgb() and rgba() formats
  const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/)
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
  }
  
  // Handle hex colors
  const hexMatch = colorString.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (hexMatch) {
    return [
      parseInt(hexMatch[1], 16),
      parseInt(hexMatch[2], 16),
      parseInt(hexMatch[3], 16)
    ]
  }
  
  // Handle named colors (expanded set)
  const namedColors: Record<string, [number, number, number]> = {
    'white': [255, 255, 255],
    'black': [0, 0, 0],
    'red': [255, 0, 0],
    'green': [0, 128, 0],
    'blue': [0, 0, 255],
    'transparent': [0, 0, 0], // Treat as black for contrast calculation
    'canvastext': [0, 0, 0], // System color - assume black in test environment
    'canvas': [255, 255, 255], // System color - assume white in test environment
    'buttontext': [0, 0, 0], // System color - assume black in test environment
    'buttonface': [240, 240, 240], // System color - assume light gray in test environment
    'initial': [0, 0, 0], // Default to black
    'inherit': [0, 0, 0], // Default to black
  }
  
  const normalizedColor = colorString.toLowerCase().trim()
  if (namedColors[normalizedColor]) {
    return namedColors[normalizedColor]
  }
  
  // Handle system colors that we can't easily parse
  if (normalizedColor.includes('canvas') || normalizedColor.includes('button') || normalizedColor.includes('system')) {
    // For system colors in test environment, assume reasonable defaults
    if (normalizedColor.includes('text')) {
      return [0, 0, 0] // Assume dark text
    } else {
      return [255, 255, 255] // Assume light background
    }
  }
  
  // Default to black if we can't parse, but don't warn for system colors
  if (!normalizedColor.includes('canvas') && !normalizedColor.includes('button')) {
    console.warn(`Could not parse color: ${colorString}`)
  }
  return [0, 0, 0]
}

/**
 * Calculate relative luminance of a color
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const [r1, g1, b1] = getRGBFromString(color1)
  const [r2, g2, b2] = getRGBFromString(color2)
  
  const l1 = getRelativeLuminance(r1, g1, b1)
  const l2 = getRelativeLuminance(r2, g2, b2)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(contrastRatio: number, isLargeText = false): boolean {
  return contrastRatio >= (isLargeText ? 3 : 4.5)
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(contrastRatio: number, isLargeText = false): boolean {
  return contrastRatio >= (isLargeText ? 4.5 : 7)
}

/**
 * Validate contrast ratio for an element
 */
export function validateElementContrast(
  element: HTMLElement,
  standard: 'AA' | 'AAA' = 'AA'
): {
  contrastRatio: number
  passes: boolean
  textColor: string
  backgroundColor: string
  isLargeText: boolean
} {
  const computedStyle = window.getComputedStyle(element)
  const textColor = computedStyle.color
  const backgroundColor = computedStyle.backgroundColor
  
  // Determine if text is large (18pt+ or 14pt+ bold)
  const fontSize = parseFloat(computedStyle.fontSize)
  const fontWeight = computedStyle.fontWeight
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
  
  const contrastRatio = calculateContrastRatio(textColor, backgroundColor)
  const passes = standard === 'AAA' 
    ? meetsWCAGAAA(contrastRatio, isLargeText)
    : meetsWCAGAA(contrastRatio, isLargeText)
  
  return {
    contrastRatio,
    passes,
    textColor,
    backgroundColor,
    isLargeText
  }
}

/**
 * Test helper to validate contrast for multiple elements
 */
export function validateContrastForElements(
  elements: HTMLElement[],
  standard: 'AA' | 'AAA' = 'AA'
): Array<{
  element: HTMLElement
  validation: ReturnType<typeof validateElementContrast>
}> {
  return elements.map(element => ({
    element,
    validation: validateElementContrast(element, standard)
  }))
}

/**
 * Custom matcher for Jest/Vitest to check contrast ratios
 */
export function toHaveAccessibleContrast(
  element: HTMLElement,
  standard: 'AA' | 'AAA' = 'AA'
) {
  const validation = validateElementContrast(element, standard)
  
  return {
    pass: validation.passes,
    message: () => {
      const standardText = standard === 'AAA' ? 'WCAG AAA' : 'WCAG AA'
      const requiredRatio = standard === 'AAA' 
        ? (validation.isLargeText ? 4.5 : 7)
        : (validation.isLargeText ? 3 : 4.5)
      
      return validation.passes
        ? `Expected element to NOT have accessible contrast (${standardText}), but it does. Contrast ratio: ${validation.contrastRatio.toFixed(2)}`
        : `Expected element to have accessible contrast (${standardText}), but it doesn't. 
           Contrast ratio: ${validation.contrastRatio.toFixed(2)} (required: ${requiredRatio})
           Text color: ${validation.textColor}
           Background color: ${validation.backgroundColor}
           Large text: ${validation.isLargeText}`
    }
  }
}

// Extend expect with custom matcher
declare global {
  namespace Vi {
    interface Assertion {
      toHaveAccessibleContrast(standard?: 'AA' | 'AAA'): void
    }
  }
}