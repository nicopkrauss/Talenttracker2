import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthCard } from '../auth-card'

describe('AuthCard', () => {
  it('renders children correctly', () => {
    render(
      <AuthCard>
        <div>Test content</div>
      </AuthCard>
    )
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies default styling classes', () => {
    const { container } = render(
      <AuthCard>
        <div>Test content</div>
      </AuthCard>
    )
    
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('w-full', 'max-w-md', 'mx-auto', 'shadow-lg', 'border-0', 'bg-card')
  })

  it('accepts custom className', () => {
    const { container } = render(
      <AuthCard className="custom-class">
        <div>Test content</div>
      </AuthCard>
    )
    
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('custom-class')
  })

  it('passes through additional props', () => {
    const { container } = render(
      <AuthCard data-testid="auth-card" role="main">
        <div>Test content</div>
      </AuthCard>
    )
    
    const card = container.firstChild as HTMLElement
    expect(card).toHaveAttribute('data-testid', 'auth-card')
    expect(card).toHaveAttribute('role', 'main')
  })

  it('has proper responsive classes', () => {
    const { container } = render(
      <AuthCard>
        <div>Test content</div>
      </AuthCard>
    )
    
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('sm:max-w-lg', 'md:max-w-md')
  })

  it('has proper content padding', () => {
    render(
      <AuthCard>
        <div>Test content</div>
      </AuthCard>
    )
    
    const cardContent = screen.getByText('Test content').parentElement
    expect(cardContent).toHaveClass('pt-4', 'pb-4', 'px-6', 'sm:px-8', 'sm:pt-6', 'sm:pb-6')
  })
})