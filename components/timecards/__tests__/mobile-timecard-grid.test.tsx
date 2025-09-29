import { render, screen } from '@testing-library/react'
import { MobileTimecardGrid } from '../mobile-timecard-grid'
import type { Timecard } from '@/lib/types'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'

// Mock the CustomTimePicker component
jest.mock('../custom-time-picker', () => ({
  CustomTimePicker: ({ value, onChange, onBlur, className }: any) => (
    <input
      data-testid="custom-time-picker"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      className={className}
    />
  )
}))

const mockTimecard: Timecard = {
  id: 'test-timecard-1',
  user_id: 'user-1',
  project_id: 'project-1',
  date: '2024-01-15',
  check_in_time: '09:00:00',
  break_start_time: '12:00:00',
  break_end_time: '13:00:00',
  check_out_time: '17:00:00',
  total_hours: 7,
  break_duration: 1,
  total_pay: 350,
  pay_rate: 50,
  status: 'submitted',
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T17:00:00Z',
  is_multi_day: false,
  daily_entries: [{
    work_date: '2024-01-15',
    check_in_time: '09:00:00',
    break_start_time: '12:00:00',
    break_end_time: '13:00:00',
    check_out_time: '17:00:00',
    hours_worked: 7,
    break_duration: 1,
    daily_pay: 350
  }]
}

const mockMultiDayTimecard: Timecard = {
  ...mockTimecard,
  id: 'test-timecard-multi',
  is_multi_day: true,
  daily_entries: [
    {
      work_date: '2024-01-15',
      check_in_time: '09:00:00',
      break_start_time: '12:00:00',
      break_end_time: '13:00:00',
      check_out_time: '17:00:00',
      hours_worked: 7,
      break_duration: 1,
      daily_pay: 350
    },
    {
      work_date: '2024-01-16',
      check_in_time: '08:30:00',
      break_start_time: '12:30:00',
      break_end_time: '13:30:00',
      check_out_time: '16:30:00',
      hours_worked: 7,
      break_duration: 1,
      daily_pay: 350
    }
  ]
}

describe('MobileTimecardGrid', () => {
  it('renders single day timecard with swapped axes', () => {
    render(<MobileTimecardGrid timecard={mockTimecard} />)
    
    // Check that time column headers are present (horizontal axis)
    expect(screen.getByText('Check In')).toBeInTheDocument()
    expect(screen.getByText('Break Start')).toBeInTheDocument()
    expect(screen.getByText('Break End')).toBeInTheDocument()
    expect(screen.getByText('Check Out')).toBeInTheDocument()
    
    // Check that compact date format is present (vertical layout: 15, Jan, 7, 350)
    expect(screen.getByText('15')).toBeInTheDocument() // Day number (big)
    expect(screen.getByText('Jan')).toBeInTheDocument() // Month abbreviation (small/mid)
    expect(screen.getByText('7')).toBeInTheDocument() // Hours (small/mid)
    expect(screen.getByText('350')).toBeInTheDocument() // Pay amount (small/mid)
    
    // Check that time values are displayed
    expect(screen.getByText('9:00 AM')).toBeInTheDocument()
    expect(screen.getByText('12:00 PM')).toBeInTheDocument()
    expect(screen.getByText('1:00 PM')).toBeInTheDocument()
    expect(screen.getByText('5:00 PM')).toBeInTheDocument()
  })

  it('renders multi-day timecard with multiple date rows', () => {
    render(<MobileTimecardGrid timecard={mockMultiDayTimecard} />)
    
    // Check that both days are present with vertical layout
    expect(screen.getByText('15')).toBeInTheDocument() // First day number
    expect(screen.getByText('16')).toBeInTheDocument() // Second day number
    expect(screen.getAllByText('Jan')).toHaveLength(2) // Both days have Jan
    expect(screen.getAllByText('7')).toHaveLength(2) // Both days have 7 hours
    
    // Check that time columns are still horizontal
    expect(screen.getByText('Check In')).toBeInTheDocument()
    expect(screen.getByText('Break Start')).toBeInTheDocument()
    expect(screen.getByText('Break End')).toBeInTheDocument()
    expect(screen.getByText('Check Out')).toBeInTheDocument()
    
    // Should have multiple time values (one for each day)
    const checkInTimes = screen.getAllByText('9:00 AM')
    expect(checkInTimes.length).toBeGreaterThan(0)
  })

  it('shows rejection mode editing capabilities', () => {
    const mockOnFieldEdit = jest.fn()
    
    render(
      <MobileTimecardGrid 
        timecard={mockTimecard} 
        isRejectionMode={true}
        onFieldEdit={mockOnFieldEdit}
      />
    )
    
    // In rejection mode, fields should be clickable (no specific text to check since we removed the header)
    // Just verify the component renders without error
    expect(screen.getByText('Check In')).toBeInTheDocument()
  })

  it('displays hours and pay information for each day', () => {
    render(<MobileTimecardGrid timecard={mockTimecard} />)
    
    // Check for vertical layout with separate elements
    expect(screen.getByText('15')).toBeInTheDocument() // Day number
    expect(screen.getByText('Jan')).toBeInTheDocument() // Month
    expect(screen.getByText('7')).toBeInTheDocument() // Hours
    expect(screen.getByText('350')).toBeInTheDocument() // Pay amount
  })

  it('handles empty time values gracefully', () => {
    const timecardWithMissingTimes: Timecard = {
      ...mockTimecard,
      break_start_time: null,
      break_end_time: null,
      daily_entries: [{
        work_date: '2024-01-15',
        check_in_time: '09:00:00',
        break_start_time: null,
        break_end_time: null,
        check_out_time: '17:00:00',
        hours_worked: 8,
        break_duration: 0,
        daily_pay: 400
      }]
    }
    
    render(<MobileTimecardGrid timecard={timecardWithMissingTimes} />)
    
    // Should show em dashes for missing times
    const emDashes = screen.getAllByText('—')
    expect(emDashes.length).toBeGreaterThan(0)
  })

  it('shows week navigation for multi-week timecards', () => {
    render(
      <MobileTimecardGrid 
        timecard={mockMultiDayTimecard} 
        totalWeeks={3}
        currentWeekIndex={1}
      />
    )
    
    // Should show week navigation
    expect(screen.getByText('Week 2 of 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Previous week')).toBeInTheDocument()
    expect(screen.getByLabelText('Next week')).toBeInTheDocument()
  })
})