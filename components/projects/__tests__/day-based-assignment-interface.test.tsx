import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DaySegmentedControl } from '../day-segmented-control'
import { AssignmentList } from '../assignment-list'
import { AssignmentDropdown } from '../assignment-dropdown'
import { createProjectSchedule } from '@/lib/schedule-utils'
import { TalentEscortPair, EscortAvailabilityStatus } from '@/lib/types'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'

// Mock the schedule utils
jest.mock('@/lib/schedule-utils', () => ({
  createProjectSchedule: jest.fn(),
  getDayType: jest.fn()
}))

describe('Day-Based Assignment Interface Components', () => {
  const mockProjectSchedule = {
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-17'),
    rehearsalDates: [new Date('2024-01-15'), new Date('2024-01-16')],
    showDates: [new Date('2024-01-17')],
    allDates: [new Date('2024-01-15'), new Date('2024-01-16'), new Date('2024-01-17')],
    isSingleDay: false
  }

  const mockScheduledTalent: TalentEscortPair[] = [
    {
      talentId: '1',
      talentName: 'John Doe',
      isGroup: false,
      escortId: 'escort-1',
      escortName: 'Jane Smith'
    },
    {
      talentId: '2',
      talentName: 'Rock Band',
      isGroup: true,
      escortId: undefined,
      escortName: undefined
    }
  ]

  const mockAvailableEscorts: EscortAvailabilityStatus[] = [
    {
      escortId: 'escort-1',
      escortName: 'Jane Smith',
      section: 'current_day_assigned',
      currentAssignment: {
        talentName: 'John Doe',
        date: new Date('2024-01-15')
      }
    },
    {
      escortId: 'escort-2',
      escortName: 'Bob Johnson',
      section: 'available'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createProjectSchedule as jest.Mock).mockReturnValue(mockProjectSchedule)
    ;(require('@/lib/schedule-utils').getDayType as jest.Mock).mockReturnValue('rehearsal')
  })

  describe('DaySegmentedControl', () => {
    it('renders all project dates as buttons', () => {
      const mockOnDateSelect = jest.fn()
      
      render(
        <DaySegmentedControl
          projectSchedule={mockProjectSchedule}
          selectedDate={null}
          onDateSelect={mockOnDateSelect}
        />
      )

      expect(screen.getByText(/Mon 15/)).toBeInTheDocument()
      expect(screen.getByText(/Tue 16/)).toBeInTheDocument()
      expect(screen.getByText(/Wed 17 \(Show\)/)).toBeInTheDocument()
    })

    it('calls onDateSelect when a date button is clicked', () => {
      const mockOnDateSelect = jest.fn()
      
      render(
        <DaySegmentedControl
          projectSchedule={mockProjectSchedule}
          selectedDate={null}
          onDateSelect={mockOnDateSelect}
        />
      )

      fireEvent.click(screen.getByText(/Mon 15/))
      expect(mockOnDateSelect).toHaveBeenCalledWith(mockProjectSchedule.allDates[0])
    })

    it('highlights selected date', () => {
      const mockOnDateSelect = jest.fn()
      
      render(
        <DaySegmentedControl
          projectSchedule={mockProjectSchedule}
          selectedDate={mockProjectSchedule.allDates[0]}
          onDateSelect={mockOnDateSelect}
        />
      )

      const selectedButton = screen.getByText(/Mon 15/)
      expect(selectedButton.closest('button')).toHaveClass('bg-primary')
    })
  })

  describe('AssignmentList', () => {
    it('renders scheduled talent for the selected date', () => {
      render(
        <AssignmentList
          selectedDate={new Date('2024-01-15')}
          projectSchedule={mockProjectSchedule}
          scheduledTalent={mockScheduledTalent}
          availableEscorts={mockAvailableEscorts}
          onAssignmentChange={jest.fn()}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Rock Band')).toBeInTheDocument()
      expect(screen.getByText('GROUP')).toBeInTheDocument()
    })

    it('shows empty state when no talent is scheduled', () => {
      render(
        <AssignmentList
          selectedDate={new Date('2024-01-15')}
          projectSchedule={mockProjectSchedule}
          scheduledTalent={[]}
          availableEscorts={mockAvailableEscorts}
          onAssignmentChange={jest.fn()}
        />
      )

      expect(screen.getByText('No talent scheduled for this day')).toBeInTheDocument()
    })

    it('displays assignment progress', () => {
      render(
        <AssignmentList
          selectedDate={new Date('2024-01-15')}
          projectSchedule={mockProjectSchedule}
          scheduledTalent={mockScheduledTalent}
          availableEscorts={mockAvailableEscorts}
          onAssignmentChange={jest.fn()}
        />
      )

      expect(screen.getByText('1 / 2 assigned')).toBeInTheDocument()
    })
  })

  describe('AssignmentDropdown', () => {
    it('renders with current escort name when assigned', () => {
      render(
        <AssignmentDropdown
          talentId="1"
          talentName="John Doe"
          isGroup={false}
          currentEscortId="escort-1"
          currentEscortName="Jane Smith"
          availableEscorts={mockAvailableEscorts}
          selectedDate={new Date('2024-01-15')}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={jest.fn()}
        />
      )

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('renders "Select Escort" when no escort assigned', () => {
      render(
        <AssignmentDropdown
          talentId="2"
          talentName="Rock Band"
          isGroup={true}
          availableEscorts={mockAvailableEscorts}
          selectedDate={new Date('2024-01-15')}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={jest.fn()}
        />
      )

      expect(screen.getByText('Select Escort')).toBeInTheDocument()
    })

    it('calls onAssignmentChange when escort is selected', async () => {
      const mockOnAssignmentChange = jest.fn()
      
      render(
        <AssignmentDropdown
          talentId="2"
          talentName="Rock Band"
          isGroup={true}
          availableEscorts={mockAvailableEscorts}
          selectedDate={new Date('2024-01-15')}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={mockOnAssignmentChange}
        />
      )

      // Click the dropdown trigger
      fireEvent.click(screen.getByText('Select Escort'))
      
      // Wait for dropdown to open and click an escort
      await waitFor(() => {
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Bob Johnson'))
      
      expect(mockOnAssignmentChange).toHaveBeenCalledWith('2', 'escort-2')
    })

    it('shows clear day button when assignments exist', () => {
      render(
        <AssignmentList
          selectedDate={new Date('2024-01-15')}
          projectSchedule={mockProjectSchedule}
          scheduledTalent={mockScheduledTalent}
          availableEscorts={mockAvailableEscorts}
          onAssignmentChange={jest.fn()}
          onClearDay={jest.fn()}
        />
      )

      expect(screen.getByText('Clear Day')).toBeInTheDocument()
    })
  })
})