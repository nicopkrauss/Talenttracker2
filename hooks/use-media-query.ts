import { useState, useEffect } from 'react'

/**
 * Custom hook to detect media query matches
 * @param query - CSS media query string (e.g., "(min-width: 1280px)")
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !mounted) {
      return
    }

    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)

    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    mediaQuery.addEventListener('change', handler)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query, mounted])

  // Return false during SSR to prevent hydration mismatches
  if (!mounted) {
    return false
  }

  return matches
}

/**
 * Predefined breakpoint hooks for common use cases
 */
export const useIsDesktop = () => useMediaQuery('(min-width: 1280px)')
export const useIsMobile = () => useMediaQuery('(max-width: 1279px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1279px)')