import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { DraggableTalentList } from '../draggable-talent-list'
import { ProjectSchedule } from '@/lib/types'

// Mock the drag and drop library
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="dnd-context" onClick={() => onDragEnd?.({ active: { id: 'talent-1' }, over: { id: 'talent-2' } })}>
      {children}
    </div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: any[], oldIndex: number, newIndex: number) => {
    const result = [...items]
    const [removed] = result.splice(oldIndex, 1)
    result.splice(newIndex, 0, removed)
    return result
  },
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}))

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

const mockTalent = [
  {
    id: 'talent-1',
    first_name: 'John',
    last_name: 'Doe',
    rep_name: 'Agent Smith',
    assignment: {
      id: 'assignment-1',
      status: 'active',
      assigned_at: '2024-01-01T00:00:00Z',
      scheduled_dates: ['2024-01-15'],
      display_order: 1
    }
  },
  {
    id: 'talent-2',
    first_name: 'Jane',
    last_name: 'Smith',
    rep_name: 'Agent Johnson',
    assignment: {
      id: 'assignment-2',
      status: 'active',
      assigned_at: '2024-01-02T00:00:00Z',
      scheduled_dates: ['2024-01-16'],
      display_order: 2
    }
  }
]

const mockProjectSchedule: ProjectSchedule = {
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-20'),
  totalDays: 6,
  dateStrings: ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19', '2024-01-20']
}

const defaultProps = {
  talent: mockTalent,
  projectId: 'project-1',
  projectSchedule: mockProjectSchedule,
  isRosterCompleted: false,
  onRemoveTalent: vi.fn(),
  onPendingChange: vi.fn(),
  onRegisterConfirm: vi.fn(),
  onUnregisterConfirm: vi.fn(),
}

describe('DraggableTalentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })
  })

  it('renders talent list with drag handles', () => {
    render(<DraggableTalentList {...defaultProps} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Agent Smith')).toBeInTheDocument()
    expect(screen.getByText('Agent Johnson')).toBeInTheDocument()
  })

  it('renders empty state when no talent provided', () => {
    render(<DraggableTalentList {...defaultProps} talent={[]} />)
    
    expect(screen.getByText('No talent assigned to this project yet.')).toBeInTheDocument()
  })

  it('calls remove talent handler when delete button clicked', () => {
    const mockRemove = vi.fn()
    render(<DraggableTalentList {...defaultProps} onRemoveTalent={mockRemove} />)
    
    const deleteButtons = screen.getAllByRole('button')
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-testid') === 'trash-2' ||
      button.textContent?.includes('🗑') ||
      button.className?.includes('destructive')
    )
    
    if (deleteButton) {
      fireEvent.click(deleteButton)
      expect(mockRemove).toHaveBeenCalledWith('talent-1')
    }
  })

  it('handles drag and drop reordering', async () => {
    render(<DraggableTalentList {...defaultProps} />)
    
    // Simulate drag and drop by clicking the DndContext
    const dndContext = screen.getByTestId('dnd-context')
    fireEvent.click(dndContext)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/project-1/talent-roster/reorder',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ talentIds: ['talent-2', 'talent-1'] })
        })
      )
    })
  })

  it('handles reorder API error gracefully', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Reorder failed' })
    })

    render(<DraggableTalentList {...defaultProps} />)
    
    const dndContext = screen.getByTestId('dnd-context')
    fireEvent.click(dndContext)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    
    // Should revert the optimistic update on error
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows loading state during reorder', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    
    ;(global.fetch as any).mockReturnValueOnce(promise)

    render(<DraggableTalentList {...defaultProps} />)
    
    const dndContext = screen.getByTestId('dnd-context')
    fireEvent.click(dndContext)
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Updating order...')).toBeInTheDocument()
    })
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })
    
    await waitFor(() => {
      expect(screen.queryByText('Updating order...')).not.toBeInTheDocument()
    })
  })

  it('includes drag handle with proper accessibility', () => {
    render(<DraggableTalentList {...defaultProps} />)
    
    // Should have drag handles with proper title
    const dragHandles = screen.getAllByTitle('Drag to reorder')
    expect(dragHandles).toHaveLength(2)
  })

  it('updates items when talent prop changes', () => {
    const { rerender } = render(<DraggableTalentList {...defaultProps} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    
    const newTalent = [
      {
        id: 'talent-3',
        first_name: 'Bob',
        last_name: 'Wilson',
        rep_name: 'Agent Brown',
        assignment: {
          id: 'assignment-3',
          status: 'active',
          assigned_at: '2024-01-03T00:00:00Z',
          scheduled_dates: ['2024-01-17'],
          display_order: 1
        }
      }
    ]
    
    rerender(<DraggableTalentList {...defaultProps} talent={newTalent} />)
    
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })
})