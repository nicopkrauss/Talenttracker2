/**
 * Test suite for escort removal and repopulation fix
 * 
 * This test verifies that when an escort is removed from a talent assignment,
 * they properly repopulate in the assignment dropdown menu as available.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AssignmentDropdown } from '../assignment-dropdown'
import { EscortAvailabilityStatus, ProjectSchedule } from '@/lib/types'
import { it } from 'date-fns/locale/it'
import { it } from 'date-fns/locale/it'
import { describe } from 'node:test'
import { it } from 'date-fns/locale/it'
import { it } from 'date-fns/locale/it'
import { describe } from 'node:test'
import { it } from 'date-fns/locale/it'
import { it } from 'date-fns/locale/it'
import { describe } from 'node:test'
import { describe } from 'node:test'

// Mock the schedule utils
vi.mock('@/lib/schedule-utils', () => ({
  getDayType: vi.fn(() => 'show')
}))

describe('Escort Removal and Repopulation Fix', () => {
  const mockProjectSchedule: ProjectSchedule = {
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-20'),
    allDates: [
      new Date('2024-01-15'),
      new Date('2024-01-16'),
      new Date('2024-01-17'),
      new Date('2024-01-18'),
      new Date('2024-01-19'),
      new Date('2024-01-20')
    ],
    rehearsalDates: [
      new Date('2024-01-15'),
      new Date('2024-01-16'),
      new Date('2024-01-17')
    ],
    showDates: [
      new Date('2024-01-18'),
      new Date('2024-01-19'),
      new Date('2024-01-20')
    ]
  }

  const selectedDate = new Date('2024-01-18')

  describe('Available Escorts Display', () => {
    it('should show escort in available section when not assigned', () => {
      const availableEscorts: EscortAvailabilityStatus[] = [
        {
          escortId: 'escort-1',
          escortName: 'Alice Johnson',
          section: 'available',
          currentAssignment: undefined
        }
      ]

      const mockOnAssignmentChange = vi.fn()

      render(
        <AssignmentDropdown
          talentId="talent-1"
          talentName="John Doe"
          isGroup={false}
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={mockOnAssignmentChange}
        />
      )

      // Open dropdown
      fireEvent.click(screen.getByRole('button', { name: /select escort/i }))

      // Should show Alice in available section
      expect(screen.getByText('Available')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    it('should show clear assignment option when escort is currently assigned', () => {
      const availableEscorts: EscortAvailabilityStatus[] = [
        {
          escortId: 'escort-1',
          escortName: 'Alice Johnson',
          section: 'available',
          currentAssignment: undefined
        }
      ]

      const mockOnAssignmentChange = vi.fn()

      render(
        <AssignmentDropdown
          talentId="talent-1"
          talentName="John Doe"
          isGroup={false}
          currentEscortId="escort-1"
          currentEscortName="Alice Johnson"
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={mockOnAssignmentChange}
        />
      )

      // Should show current assignment
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()

      // Open dropdown
      fireEvent.click(screen.getByRole('button'))

      // Should show clear assignment option
      expect(screen.getByText('Clear Assignment')).toBeInTheDocument()
    })
  })

  describe('Assignment and Removal Flow', () => {
    it('should call onAssignmentChange with escort ID when assigning', async () => {
      const availableEscorts: EscortAvailabilityStatus[] = [
        {
          escortId: 'escort-1',
          escortName: 'Alice Johnson',
          section: 'available',
          currentAssignment: undefined
        }
      ]

      const mockOnAssignmentChange = vi.fn()

      render(
        <AssignmentDropdown
          talentId="talent-1"
          talentName="John Doe"
          isGroup={false}
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={mockOnAssignmentChange}
        />
      )

      // Open dropdown and select escort
      fireEvent.click(screen.getByRole('button', { name: /select escort/i }))
      fireEvent.click(screen.getByText('Alice Johnson'))

      expect(mockOnAssignmentChange).toHaveBeenCalledWith('talent-1', 'escort-1')
    })

    it('should call onAssignmentChange with null when clearing assignment', async () => {
      const availableEscorts: EscortAvailabilityStatus[] = [
        {
          escortId: 'escort-1',
          escortName: 'Alice Johnson',
          section: 'available',
          currentAssignment: undefined
        }
      ]

      const mockOnAssignmentChange = vi.fn()

      render(
        <AssignmentDropdown
          talentId="talent-1"
          talentName="John Doe"
          isGroup={false}
          currentEscortId="escort-1"
          currentEscortName="Alice Johnson"
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={mockOnAssignmentChange}
        />
      )

      // Open dropdown and clear assignment
      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByText('Clear Assignment'))

      expect(mockOnAssignmentChange).toHaveBeenCalledWith('talent-1', null)
    })
  })

  describe('Escort Filtering and Organization', () => {
    it('should properly organize escorts by section', () => {
      const availableEscorts: EscortAvailabilityStatus[] = [
        {
          escortId: 'escort-1',
          escortName: 'Alice Johnson',
          section: 'available',
          currentAssignment: undefined
        },
        {
          escortId: 'escort-2',
          escortName: 'Bob Wilson',
          section: 'current_day_assigned',
          currentAssignment: {
            talentName: 'Jane Smith',
            date: selectedDate
          }
        }
      ]

      const mockOnAssignmentChange = vi.fn()

      render(
        <AssignmentDropdown
          talentId="talent-1"
          talentName="John Doe"
          isGroup={false}
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={mockOnAssignmentChange}
        />
      )

      // Open dropdown
      fireEvent.click(screen.getByRole('button', { name: /select escort/i }))

      // Should show available section
      expect(screen.getByText('Available')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()

      // Should show assigned section (collapsed)
      expect(screen.getByText(/Already Assigned for/)).toBeInTheDocument()
      
      // Expand assigned section
      fireEvent.click(screen.getByText(/Already Assigned for/))
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })

    it('should filter escorts based on search query', () => {
      const availableEscorts: EscortAvailabilityStatus[] = [
        {
          escortId: 'escort-1',
          escortName: 'Alice Johnson',
          section: 'available',
          currentAssignment: undefined
        },
        {
          escortId: 'escort-2',
          escortName: 'Bob Wilson',
          section: 'available',
          currentAssignment: undefined
        }
      ]

      const mockOnAssignmentChange = vi.fn()

      render(
        <AssignmentDropdown
          talentId="talent-1"
          talentName="John Doe"
          isGroup={false}
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={mockProjectSchedule}
          onAssignmentChange={mockOnAssignmentChange}
        />
      )

      // Open dropdown
      fireEvent.click(screen.getByRole('button', { name: /select escort/i }))

      // Both escorts should be visible initially
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()

      // Search for "Alice"
      const searchInput = screen.getByPlaceholderText('Search escorts...')
      fireEvent.change(searchInput, { target: { value: 'Alice' } })

      // Only Alice should be visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
    })
  })
})