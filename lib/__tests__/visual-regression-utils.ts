import { render, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { renderWithLightTheme, renderWithDarkTheme, simulateThemeSwitch, waitForThemeTransition } from './theme-test-utils'

/**
 * Visual regression testing utilities for theme switching
 */

export interface VisualSnapshot {
  theme: 'light' | 'dark'
  timestamp: number
  elementStyles: Record<string, CSSStyleDeclaration>
  computedColors: {
    background: string
    text: string
    border: string
  }
}

/**
 * Capture visual snapshot of component in specific theme
 */
export function captureThemeSnapshot(
  container: HTMLElement,
  theme: 'light' | 'dark'
): VisualSnapshot {
  const elements = container.querySelectorAll('*')
  const elementStyles: Record<string, CSSStyleDeclaration> = {}
  
  elements.forEach((element, index) => {
    if (element instanceof HTMLElement) {
      elementStyles[`element-${index}`] = window.getComputedStyle(element)
    }
  })
  
  // Capture key computed colors
  const rootElement = container.firstElementChild as HTMLElement
  const rootStyles = rootElement ? window.getComputedStyle(rootElement) : null
  
  return {
    theme,
    timestamp: Date.now(),
    elementStyles,
    computedColors: {
      background: rootStyles?.backgroundColor || 'transparent',
      text: rootStyles?.color || 'inherit',
      border: rootStyles?.borderColor || 'transparent'
    }
  }
}

/**
 * Compare two visual snapshots for differences
 */
export function compareSnapshots(
  snapshot1: VisualSnapshot,
  snapshot2: VisualSnapshot
): {
  hasDifferences: boolean
  differences: Array<{
    property: string
    theme1Value: string
    theme2Value: string
  }>
} {
  const differences: Array<{
    property: string
    theme1Value: string
    theme2Value: string
  }> = []
  
  // Compare computed colors
  Object.keys(snapshot1.computedColors).forEach(key => {
    const key1 = key as keyof typeof snapshot1.computedColors
    const value1 = snapshot1.computedColors[key1]
    const value2 = snapshot2.computedColors[key1]
    
    if (value1 !== value2) {
      differences.push({
        property: `computedColors.${key}`,
        theme1Value: value1,
        theme2Value: value2
      })
    }
  })
  
  return {
    hasDifferences: differences.length > 0,
    differences
  }
}

/**
 * Test component theme switching with visual regression detection
 */
export async function testThemeSwitching(
  ui: ReactElement,
  options?: {
    expectDifferences?: boolean
    ignoreProperties?: string[]
  }
): Promise<{
  lightSnapshot: VisualSnapshot
  darkSnapshot: VisualSnapshot
  comparison: ReturnType<typeof compareSnapshots>
}> {
  const { expectDifferences = true, ignoreProperties = [] } = options || {}
  
  // Render in light theme
  const lightRender = renderWithLightTheme(ui)
  await waitForThemeTransition()
  const lightSnapshot = captureThemeSnapshot(lightRender.container, 'light')
  
  // Render in dark theme
  const darkRender = renderWithDarkTheme(ui)
  await waitForThemeTransition()
  const darkSnapshot = captureThemeSnapshot(darkRender.container, 'dark')
  
  // Compare snapshots
  const comparison = compareSnapshots(lightSnapshot, darkSnapshot)
  
  // Filter out ignored properties
  if (ignoreProperties.length > 0) {
    comparison.differences = comparison.differences.filter(
      diff => !ignoreProperties.some(prop => diff.property.includes(prop))
    )
    comparison.hasDifferences = comparison.differences.length > 0
  }
  
  // Cleanup
  lightRender.unmount()
  darkRender.unmount()
  
  return {
    lightSnapshot,
    darkSnapshot,
    comparison
  }
}

/**
 * Test theme switching performance
 */
export async function testThemeSwitchingPerformance(
  ui: ReactElement
): Promise<{
  switchToLightTime: number
  switchToDarkTime: number
  averageSwitchTime: number
}> {
  const { rerender } = render(ui)
  
  // Measure switch to dark theme
  const darkStart = performance.now()
  simulateThemeSwitch('dark')
  await waitForThemeTransition()
  const darkEnd = performance.now()
  const switchToDarkTime = darkEnd - darkStart
  
  // Measure switch to light theme
  const lightStart = performance.now()
  simulateThemeSwitch('light')
  await waitForThemeTransition()
  const lightEnd = performance.now()
  const switchToLightTime = lightEnd - lightStart
  
  return {
    switchToLightTime,
    switchToDarkTime,
    averageSwitchTime: (switchToLightTime + switchToDarkTime) / 2
  }
}

/**
 * Detect layout shifts during theme switching
 */
export async function detectLayoutShifts(
  ui: ReactElement
): Promise<{
  hasLayoutShift: boolean
  measurements: {
    light: DOMRect
    dark: DOMRect
  }
}> {
  // Render in light theme and measure
  const lightRender = renderWithLightTheme(ui)
  await waitForThemeTransition()
  const lightElement = lightRender.container.firstElementChild as HTMLElement
  const lightRect = lightElement?.getBoundingClientRect() || new DOMRect()
  
  // Render in dark theme and measure
  const darkRender = renderWithDarkTheme(ui)
  await waitForThemeTransition()
  const darkElement = darkRender.container.firstElementChild as HTMLElement
  const darkRect = darkElement?.getBoundingClientRect() || new DOMRect()
  
  // Check for layout shifts
  const hasLayoutShift = 
    lightRect.width !== darkRect.width ||
    lightRect.height !== darkRect.height ||
    lightRect.x !== darkRect.x ||
    lightRect.y !== darkRect.y
  
  // Cleanup
  lightRender.unmount()
  darkRender.unmount()
  
  return {
    hasLayoutShift,
    measurements: {
      light: lightRect,
      dark: darkRect
    }
  }
}

/**
 * Validate that theme switching doesn't break component functionality
 */
export async function validateThemeFunctionality(
  ui: ReactElement,
  functionalityTest: (container: HTMLElement) => Promise<void> | void
): Promise<{
  lightThemeWorks: boolean
  darkThemeWorks: boolean
  errors: string[]
}> {
  const errors: string[] = []
  let lightThemeWorks = false
  let darkThemeWorks = false
  
  // Test light theme functionality
  try {
    const lightRender = renderWithLightTheme(ui)
    await waitForThemeTransition()
    await functionalityTest(lightRender.container)
    lightThemeWorks = true
    lightRender.unmount()
  } catch (error) {
    errors.push(`Light theme error: ${error}`)
  }
  
  // Test dark theme functionality
  try {
    const darkRender = renderWithDarkTheme(ui)
    await waitForThemeTransition()
    await functionalityTest(darkRender.container)
    darkThemeWorks = true
    darkRender.unmount()
  } catch (error) {
    errors.push(`Dark theme error: ${error}`)
  }
  
  return {
    lightThemeWorks,
    darkThemeWorks,
    errors
  }
}