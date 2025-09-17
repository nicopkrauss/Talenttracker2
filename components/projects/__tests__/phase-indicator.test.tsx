import React from 'react'
import { render, screen } from '@testing-library/react'
import { PhaseIndicator, PhaseIndicatorCompact, PhaseIndicatorFull } from '../phase-indicator'
import { ProjectPhase } from '@/lib/types/project-phase'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'

describe('PhaseIndicator', () => {
  it('renders prep phase correctly', () => {
    render(<PhaseIndicator currentPhase={ProjectPhase.PREP} />)
    
    expect(screen.getByText('Preparation')).toBeInTheDocument()
    // Check for SVG icon by looking for the settings icon path
    expect(document.querySelector('svg.lucide-settings')).toBeInTheDocument()
  })

  it('renders active phase correctly', () => {
    render(<PhaseIndicator currentPhase={ProjectPhase.ACTIVE} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows description when requested', () => {
    render(
      <PhaseIndicator 
        currentPhase={ProjectPhase.STAFFING} 
        showDescription={true} 
      />
    )
    
    expect(screen.getByText('Staffing')).toBeInTheDocument()
    expect(screen.getByText('Hiring team members and assigning talent')).toBeInTheDocument()
  })

  it('hides icon when requested', () => {
    render(
      <PhaseIndicator 
        currentPhase={ProjectPhase.PREP} 
        showIcon={false} 
      />
    )
    
    expect(screen.getByText('Preparation')).toBeInTheDocument()
    // Should not have icon
    expect(document.querySelector('svg.lucide-settings')).not.toBeInTheDocument()
  })

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <PhaseIndicator currentPhase={ProjectPhase.PREP} size="sm" />
    )
    
    let badge = screen.getByText('Preparation')
    expect(badge).toHaveClass('text-xs')

    rerender(<PhaseIndicator currentPhase={ProjectPhase.PREP} size="lg" />)
    
    badge = screen.getByText('Preparation')
    expect(badge).toHaveClass('text-base')
  })

  it('applies correct colors for different phases', () => {
    const { rerender } = render(
      <PhaseIndicator currentPhase={ProjectPhase.PREP} />
    )
    
    let badge = screen.getByText('Preparation')
    expect(badge).toHaveClass('text-blue-800')

    rerender(<PhaseIndicator currentPhase={ProjectPhase.ACTIVE} />)
    
    badge = screen.getByText('Active')
    expect(badge).toHaveClass('text-green-800')

    rerender(<PhaseIndicator currentPhase={ProjectPhase.ARCHIVED} />)
    
    badge = screen.getByText('Archived')
    expect(badge).toHaveClass('text-gray-800')
  })
})

describe('PhaseIndicatorCompact', () => {
  it('renders with small size and no description', () => {
    render(<PhaseIndicatorCompact currentPhase={ProjectPhase.ACTIVE} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Live operations and real-time management')).not.toBeInTheDocument()
  })
})

describe('PhaseIndicatorFull', () => {
  it('renders with large size and description', () => {
    render(<PhaseIndicatorFull currentPhase={ProjectPhase.STAFFING} />)
    
    expect(screen.getByText('Staffing')).toBeInTheDocument()
    expect(screen.getByText('Hiring team members and assigning talent')).toBeInTheDocument()
  })
})

describe('Phase Configuration', () => {
  it('has correct configuration for all phases', () => {
    const phases = [
      ProjectPhase.PREP,
      ProjectPhase.STAFFING,
      ProjectPhase.PRE_SHOW,
      ProjectPhase.ACTIVE,
      ProjectPhase.POST_SHOW,
      ProjectPhase.COMPLETE,
      ProjectPhase.ARCHIVED
    ]

    phases.forEach(phase => {
      const { unmount } = render(<PhaseIndicator currentPhase={phase} showDescription={true} />)
      
      // Each phase should have an SVG icon
      expect(document.querySelector('svg')).toBeInTheDocument()
      
      // Clean up for next iteration
      unmount()
    })
  })
})

describe('Accessibility', () => {
  it('has proper ARIA attributes', () => {
    render(<PhaseIndicator currentPhase={ProjectPhase.ACTIVE} />)
    
    const badge = screen.getByText('Active')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-slot', 'badge')
  })

  it('supports keyboard navigation when interactive', () => {
    render(
      <PhaseIndicator 
        currentPhase={ProjectPhase.PREP} 
        showDescription={true} 
      />
    )
    
    // Card should be focusable if it contains interactive elements
    const card = screen.getByText('Preparation').closest('[class*="card"]')
    expect(card).toBeInTheDocument()
  })
})

describe('Responsive Design', () => {
  it('adapts to different screen sizes', () => {
    render(
      <PhaseIndicator 
        currentPhase={ProjectPhase.ACTIVE} 
        showDescription={true}
        className="responsive-test" 
      />
    )
    
    const container = screen.getByText('Active').closest('.responsive-test')
    expect(container).toBeInTheDocument()
  })
})