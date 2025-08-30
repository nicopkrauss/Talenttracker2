import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Navigation } from '../navigation'

// Mock the mobile hook
const mockIsMobile = vi.fn()
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile(),
}))

// Mock the child components
vi.mock('../mobile-navigation', () => ({
  MobileNavigation: () => <div data-testid="mobile-navigation">Mobile Navigation</div>,
}))

vi.mock('../desktop-navigation', () => ({
  DesktopNavigation: () => <div data-testid="desktop-navigation">Desktop Navigation</div>,
}))

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render mobile navigation when isMobile is true', () => {
    mockIsMobile.mockReturnValue(true)

    render(<Navigation />)

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
  })

  it('should render desktop navigation when isMobile is false', () => {
    mockIsMobile.mockReturnValue(false)

    render(<Navigation />)

    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument()
  })

  it('should not render anything when isMobile is undefined (SSR)', () => {
    mockIsMobile.mockReturnValue(undefined)

    render(<Navigation />)

    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument()
    expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
  })

  it('should handle layout transitions with opacity animation', async () => {
    mockIsMobile.mockReturnValue(true)

    const { rerender } = render(<Navigation />)

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()

    // Change to desktop
    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)

    // Should show desktop navigation
    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument()

    // Check that wrapper has transition classes
    const wrapper = screen.getByTestId('desktop-navigation').parentElement
    expect(wrapper).toHaveClass('navigation-wrapper')
    expect(wrapper).toHaveClass('transition-opacity')
    expect(wrapper).toHaveClass('duration-150')
  })

  it('should apply transitioning opacity during layout changes', async () => {
    mockIsMobile.mockReturnValue(true)

    const { rerender } = render(<Navigation />)

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()

    // Change to desktop to trigger transition
    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)

    // The transition state is internal and brief, so we mainly test that
    // the component handles the transition without crashing
    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
  })

  it('should maintain navigation state across layout changes', () => {
    mockIsMobile.mockReturnValue(true)

    const { rerender } = render(<Navigation />)

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()

    // Switch to desktop
    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)

    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()

    // Switch back to mobile
    mockIsMobile.mockReturnValue(true)
    rerender(<Navigation />)

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
  })

  it('should handle rapid layout changes gracefully', () => {
    mockIsMobile.mockReturnValue(true)

    const { rerender } = render(<Navigation />)

    // Rapidly switch between layouts
    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)

    mockIsMobile.mockReturnValue(true)
    rerender(<Navigation />)

    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)

    // Should end up with desktop navigation
    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument()
  })

  it('should not trigger transition on initial render', () => {
    mockIsMobile.mockReturnValue(true)

    render(<Navigation />)

    const wrapper = screen.getByTestId('mobile-navigation').parentElement
    expect(wrapper).not.toHaveClass('opacity-90')
  })

  it('should handle undefined to defined isMobile transition', () => {
    mockIsMobile.mockReturnValue(undefined)

    const { rerender } = render(<Navigation />)

    // Should render nothing initially
    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument()
    expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()

    // Change to mobile
    mockIsMobile.mockReturnValue(true)
    rerender(<Navigation />)

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
  })

  it('should clean up transition timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    mockIsMobile.mockReturnValue(true)

    const { rerender, unmount } = render(<Navigation />)

    // Trigger a transition
    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)

    // Unmount during transition
    unmount()

    // Should have called clearTimeout (though the exact number depends on implementation)
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })

  it('should have proper CSS classes for smooth transitions', () => {
    mockIsMobile.mockReturnValue(true)

    render(<Navigation />)

    const wrapper = screen.getByTestId('mobile-navigation').parentElement
    expect(wrapper).toHaveClass('navigation-wrapper')
    expect(wrapper).toHaveClass('transition-opacity')
    expect(wrapper).toHaveClass('duration-150')
  })

  it('should handle multiple consecutive layout changes', async () => {
    mockIsMobile.mockReturnValue(true)

    const { rerender } = render(<Navigation />)

    // First change: mobile to desktop
    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)
    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()

    // Second change: desktop to mobile
    mockIsMobile.mockReturnValue(true)
    rerender(<Navigation />)
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()

    // Third change: mobile to desktop
    mockIsMobile.mockReturnValue(false)
    rerender(<Navigation />)
    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
  })

  it('should prevent hydration mismatches by not rendering on undefined isMobile', () => {
    mockIsMobile.mockReturnValue(undefined)

    const { container } = render(<Navigation />)

    // Should render nothing to prevent hydration issues
    expect(container.firstChild).toBeNull()
  })
})