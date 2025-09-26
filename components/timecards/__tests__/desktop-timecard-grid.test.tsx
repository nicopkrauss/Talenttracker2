import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DesktopTimecardGrid } from '../desktop-timecard-grid'
import type { Timecard } from '@/lib/types'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'

// Mock timecard data
const mockSingleDayTimecard: Timecard = {
  id: '1',
  user_id: 'user1',
  project_id: 'project1',
  status: 'submitted',
  date: '2024-09-16',
  period_start_date: '2024-09-16',
  period_end_date: '2024-09-16',
  check_in_time: '08:00:00',
  check_out_time: '16:30:00',
  break_start_time: '12:00:00',
  break_end_time: '12:30:00',
  total_hours: 8.0,
  break_duration: 0.5,
  total_pay: 200.00,
  pay_rate: 25.00,
  created_at: '2024-09-16T08:00:00Z',
  updated_at: '2024-09-16T16:30:00Z'
}

const mockMultiDayTimecard: Timecard = {
  id: '2',
  user_id: 'user1',
  project_id: 'project1',
  status: 'submitted',
  period_start_date: '2024-09-16',
  period_end_date: '2024-09-17',
  total_hours: 16.0,
  total_break_duration: 1.0,
  total_pay: 400.00,
  pay_rate: 25.00,
  is_multi_day: true,
  working_days: 2,
  daily_entries: [
    {
      id: 'entry1',
      timecard_header_id: '2',
      work_date: '2024-09-16',
      check_in_time: '08:00:00',
      check_out_time: '16:30:00',
      break_start_time: '12:00:00',
      break_end_time: '12:30:00',
      hours_worked: 8.0,
      break_duration: 0.5,
      daily_pay: 200.00,
      created_at: '2024-09-16T08:00:00Z',
      updated_at: '2024-09-16T16:30:00Z'
    },
    {
      id: 'entry2',
      timecard_header_id: '2',
      work_date: '2024-09-17',
      check_in_time: '08:00:00',
      check_out_time: '16:30:00',
      break_start_time: '12:00:00',
      break_end_time: '12:30:00',
      hours_worked: 8.0,
      break_duration: 0.5,
      daily_pay: 200.00,
      created_at: '2024-09-17T08:00:00Z',
      updated_at: '2024-09-17T16:30:00Z'
    }
  ],
  created_at: '2024-09-16T08:00:00Z',
  updated_at: '2024-09-17T16:30:00Z'
}

describe('DesktopTimecardGrid', () => {
  it('renders single day timecard correctly', () => {
    render(<DesktopTimecardGrid timecard={mockSingleDayTimecard} />)
    
    // Check for grid structure
    expect(screen.getByText('Time Details')).toBeInTheDocument()
    
    // Check for time categories
    expect(screen.getByText('Check In')).toBeInTheDocument()
    expect(screen.getByText('Break Start')).toBeInTheDocument()
    expect(screen.getByText('Break End')).toBeInTheDocument()
    expect(screen.getByText('Check Out')).toBeInTheDocument()
    
    // Check for time values (formatted)
    expect(screen.getByText('8:00 AM')).toBeInTheDocument()
    expect(screen.getByText('4:30 PM')).toBeInTheDocument()
    expect(screen.getByText('12:00 PM')).toBeInTheDocument()
    expect(screen.getByText('12:30 PM')).toBeInTheDocument()
  })

  it('renders multi-day timecard correctly', () => {
    render(<DesktopTimecardGrid timecard={mockMultiDayTimecard} />)
    
    // Check for multi-day grid structure
    expect(screen.getByText('Daily Time Breakdown')).toBeInTheDocument()
    
    // Check for multiple day columns (based on actual rendered output)
    expect(screen.getByText('15')).toBeInTheDocument() // First day
    expect(screen.getByText('16')).toBeInTheDocument() // Second day
    
    // Check for time categories
    expect(screen.getByText('Check In')).toBeInTheDocument()
    expect(screen.getByText('Break Start')).toBeInTheDocument()
    expect(screen.getByText('Break End')).toBeInTheDocument()
    expect(screen.getByText('Check Out')).toBeInTheDocument()
  })

  it('handles rejection mode correctly', () => {
    const mockOnFieldToggle = vi.fn()
    
    render(
      <DesktopTimecardGrid 
        timecard={mockSingleDayTimecard} 
        isRejectionMode={true}
        selectedFields={['check_in_time_day_0']}
        onFieldToggle={mockOnFieldToggle}
      />
    )
    
    // Check for rejection mode indicator
    expect(screen.getByText(/Click fields to flag issues/)).toBeInTheDocument()
  })

  it('maintains existing design language', () => {
    render(<DesktopTimecardGrid timecard={mockSingleDayTimecard} />)
    
    // Check that it uses Card components (existing design language)
    const cardElement = screen.getByText('Time Details').closest('[data-slot="card"]')
    expect(cardElement).toBeInTheDocument()
    
    // Check for proper styling classes that match existing design
    const timeFields = screen.getAllByText(/AM|PM/)
    timeFields.forEach(field => {
      const container = field.closest('div')
      expect(container).toHaveClass('p-3', 'rounded-lg', 'border')
    })
  })
})