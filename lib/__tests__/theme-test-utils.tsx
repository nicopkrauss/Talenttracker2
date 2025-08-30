import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'

// Theme wrapper component for testing
interface ThemeWrapperProps {
  children: ReactNode
  theme?: 'light' | 'dark' | 'system'
}

function ThemeWrapper({ children, theme = 'light' }: ThemeWrapperProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem={false}
      disableTransitionOnChange
      forcedTheme={theme}
    >
      <div className={theme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </ThemeProvider>
  )
}

// Custom render function for light theme
export function renderWithLightTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeWrapper theme="light">{children}</ThemeWrapper>,
    ...options,
  })
}

// Custom render function for dark theme
export function renderWithDarkTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeWrapper theme="dark">{children}</ThemeWrapper>,
    ...options,
  })
}

// Custom render function that tests both themes
export function renderWithBothThemes(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const lightRender = renderWithLightTheme(ui, options)
  const darkRender = renderWithDarkTheme(ui, options)
  
  return {
    light: lightRender,
    dark: darkRender,
  }
}

// Utility to get computed styles for theme testing
export function getComputedThemeStyles(element: HTMLElement) {
  const computedStyle = window.getComputedStyle(element)
  
  return {
    backgroundColor: computedStyle.backgroundColor,
    color: computedStyle.color,
    borderColor: computedStyle.borderColor,
  }
}

// Utility to simulate theme switching
export function simulateThemeSwitch(theme: 'light' | 'dark') {
  const html = document.documentElement
  
  if (theme === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
  
  // Trigger a custom event to simulate theme change
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }))
}

// Helper to wait for theme transition
export function waitForThemeTransition(): Promise<void> {
  return new Promise((resolve) => {
    // Wait for CSS transitions to complete
    setTimeout(resolve, 100)
  })
}

// Utility to test component in both themes and compare
export async function testComponentInBothThemes(
  ui: ReactElement,
  testFn: (container: HTMLElement, theme: 'light' | 'dark') => void | Promise<void>
) {
  const { light, dark } = renderWithBothThemes(ui)
  
  // Test light theme
  await testFn(light.container, 'light')
  
  // Test dark theme  
  await testFn(dark.container, 'dark')
  
  // Cleanup
  light.unmount()
  dark.unmount()
}