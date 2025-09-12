"use client"

import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GripVertical, Users, ChevronDown, ChevronRight, Edit, Check } from 'lucide-react'
import { TrashButton } from '@/components/ui/trash-button'
import { TalentScheduleColumn } from '@/components/projects/talent-schedule-column'
import { ProjectSchedule, TalentGroup } from '@/lib/types'
import { GroupBadge } from '@/components/projects/group-badge'
import { useToast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ProjectTalent {
  id: string
  first_name: string
  last_name: string
  rep_name?: string
  assignment?: {
    id: string
    status: string
    assigned_at: string
    scheduled_dates?: string[]
    display_order?: number
  }
}

interface RosterItem {
  id: string
  type: 'talent' | 'group'
  displayOrder: number
  data: ProjectTalent | TalentGroup
}

interface DraggableTalentListProps {
  talent: ProjectTalent[]
  projectId: string
  projectSchedule: ProjectSchedule
  isRosterCompleted?: boolean
  onRemoveTalent: (talentId: string) => void
  onPendingChange: (talentId: string, hasPendingChanges: boolean) => void
  onRegisterConfirm: (talentId: string, confirmFn: () => Promise<void>) => void
  onUnregisterConfirm: (talentId: string) => void
  talentGroups?: TalentGroup[]
  expandedGroups?: Set<string>
  onToggleGroupExpansion?: (groupId: string) => void
  onRemoveGroup?: (groupId: string) => void
  onEditGroup?: (groupId: string) => void
  onReorderComplete?: () => Promise<void>
  showEmptyState?: boolean
  emptyStateMessage?: React.ReactNode
  // New props for confirm all functionality
  pendingChanges?: Set<string>
  onConfirmAll?: () => void
  // Request state props
  isRequestActive?: (id: string) => boolean
  activeRequests?: Map<string, any>
}

interface SortableTalentRowProps {
  talent: ProjectTalent
  projectId: string
  projectSchedule: ProjectSchedule
  isRosterCompleted?: boolean
  onRemoveTalent: (talentId: string) => void
  onPendingChange: (talentId: string, hasPendingChanges: boolean) => void
  onRegisterConfirm: (talentId: string, confirmFn: () => Promise<void>) => void
  onUnregisterConfirm: (talentId: string) => void
}

function SortableTalentRow({
  talent,
  projectId,
  projectSchedule,
  isRosterCompleted,
  onRemoveTalent,
  onPendingChange,
  onRegisterConfirm,
  onUnregisterConfirm,
}: SortableTalentRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: talent.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'z-50' : ''}>
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              {`${talent.first_name?.[0] || ''}${talent.last_name?.[0] || ''}`}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{talent.first_name} {talent.last_name}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-left">
        <TalentScheduleColumn
          talentId={talent.id}
          projectId={projectId}
          projectSchedule={projectSchedule}
          initialScheduledDates={talent.assignment?.scheduled_dates || []}
          isGroup={false}
          disabled={isRosterCompleted}
          onPendingChange={onPendingChange}
          onRegisterConfirm={onRegisterConfirm}
          onUnregisterConfirm={onUnregisterConfirm}
        />
      </TableCell>
      <TableCell className="w-48">
        <div className="flex items-center justify-end">
          <TrashButton onClick={() => onRemoveTalent(talent.id)} variant="outline" />
        </div>
      </TableCell>
    </TableRow>
  )
}

interface SortableGroupRowProps {
  group: TalentGroup
  projectId: string
  projectSchedule: ProjectSchedule
  isRosterCompleted?: boolean
  isExpanded: boolean
  onToggleExpansion: () => void
  onRemoveGroup: () => void
  onEditGroup?: () => void
  onPendingChange: (talentId: string, hasPendingChanges: boolean) => void
  onRegisterConfirm: (talentId: string, confirmFn: () => Promise<void>) => void
  onUnregisterConfirm: (talentId: string) => void
}

function SortableGroupRow({
  group,
  projectId,
  projectSchedule,
  isRosterCompleted,
  isExpanded,
  onToggleExpansion,
  onRemoveGroup,
  onEditGroup,
  onPendingChange,
  onRegisterConfirm,
  onUnregisterConfirm,
}: SortableGroupRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'z-50' : ''}>
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              <Users className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={onToggleExpansion}
            >
              <GroupBadge showTooltip />
              <div className="font-medium">{group.groupName || group.group_name}</div>
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-muted-foreground bg-muted rounded-full">
                {group.members.length}
              </span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-left">
        <TalentScheduleColumn
          talentId={group.id}
          projectId={projectId}
          projectSchedule={projectSchedule}
          initialScheduledDates={group.scheduledDates || group.scheduled_dates || []}
          isGroup={true}
          disabled={isRosterCompleted}
          onPendingChange={onPendingChange}
          onRegisterConfirm={onRegisterConfirm}
          onUnregisterConfirm={onUnregisterConfirm}
        />
      </TableCell>
      <TableCell className="w-48">
        <div className="flex items-center gap-1 justify-end">
          {onEditGroup && (
            <Button
              variant="outline"
              onClick={onEditGroup}
              className="h-7 w-7 p-0 text-foreground hover:text-foreground"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          <TrashButton onClick={onRemoveGroup} variant="outline" />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function DraggableTalentList({
  talent,
  projectId,
  projectSchedule,
  isRosterCompleted,
  onRemoveTalent,
  onPendingChange,
  onRegisterConfirm,
  onUnregisterConfirm,
  talentGroups = [],
  expandedGroups = new Set(),
  onToggleGroupExpansion,
  onRemoveGroup,
  onEditGroup,
  onReorderComplete,
  showEmptyState = false,
  emptyStateMessage,
  pendingChanges = new Set(),
  onConfirmAll,
  isRequestActive,
  activeRequests,
}: DraggableTalentListProps) {
  const { toast } = useToast()
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Create initial roster items from props
  const initialRosterItems: RosterItem[] = React.useMemo(() => {
    const talentItems: RosterItem[] = talent.map(person => ({
      id: person.id,
      type: 'talent' as const,
      displayOrder: person.assignment?.display_order || 0,
      data: person
    }))

    const groupItems: RosterItem[] = talentGroups.map(group => ({
      id: group.id,
      type: 'group' as const,
      displayOrder: group.displayOrder || group.display_order || 1000,
      data: group
    }))

    // Combine and sort by display order (descending - highest numbers first)
    return [...talentItems, ...groupItems].sort((a, b) => b.displayOrder - a.displayOrder)
  }, [talent, talentGroups])

  // Local state for optimistic updates
  const [rosterItems, setRosterItems] = useState<RosterItem[]>(initialRosterItems)
  const allowParentSync = React.useRef<boolean>(true)

  // Only sync from parent when explicitly allowed
  React.useEffect(() => {
    if (allowParentSync.current) {
      setRosterItems(initialRosterItems)
    }
  }, [initialRosterItems])

  // Function to force sync with parent data
  const forceSyncWithParent = React.useCallback(() => {
    allowParentSync.current = true
    setRosterItems(initialRosterItems)
  }, [initialRosterItems])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = rosterItems.findIndex((item) => item.id === active.id)
      const newIndex = rosterItems.findIndex((item) => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      // Optimistic update - immediately update the local UI state
      const newItems = arrayMove(rosterItems, oldIndex, newIndex)
      setRosterItems(newItems)

      // Update display orders based on new positions (descending order)
      const updatedItems = newItems.map((item, index) => ({
        id: item.id,
        type: item.type,
        displayOrder: newItems.length - index // Highest number for first item
      }))

      // Disable parent sync during drag operation
      allowParentSync.current = false

      // Update the server with the new unified order in the background
      setIsReordering(true)
      try {
        const response = await fetch(`/api/projects/${projectId}/talent-roster/reorder-unified`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: updatedItems })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to reorder items')
        }

        toast({
          title: "Success",
          description: "Roster order updated successfully"
        })

        // Re-enable parent sync after successful reorder so new assignments can appear
        // Use setTimeout to avoid interfering with the current drag state
        setTimeout(() => {
          allowParentSync.current = true
        }, 100)

      } catch (error) {
        console.error('Error reordering roster:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to reorder roster",
          variant: "destructive"
        })
        
        // On error, force sync with parent to revert
        forceSyncWithParent()
      } finally {
        setIsReordering(false)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-left min-w-[140px]">Schedule</TableHead>
            <TableHead className="w-48 text-right">
              {pendingChanges.size > 0 && onConfirmAll && (
                <Button
                  onClick={onConfirmAll}
                  className="gap-2"
                  size="sm"
                >
                  <Check className="h-4 w-4" />
                  Confirm All ({pendingChanges.size})
                </Button>
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showEmptyState ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                {emptyStateMessage}
              </TableCell>
            </TableRow>
          ) : (
            <>
              <SortableContext items={rosterItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {rosterItems.map((item) => {
                  if (item.type === 'talent') {
                    const talent = item.data as ProjectTalent
                    return (
                      <SortableTalentRow
                        key={talent.id}
                        talent={talent}
                        projectId={projectId}
                        projectSchedule={projectSchedule}
                        isRosterCompleted={isRosterCompleted}
                        onRemoveTalent={onRemoveTalent}
                        onPendingChange={onPendingChange}
                        onRegisterConfirm={onRegisterConfirm}
                        onUnregisterConfirm={onUnregisterConfirm}
                      />
                    )
                  } else {
                    const group = item.data as TalentGroup
                    const isExpanded = expandedGroups.has(group.id)
                    return (
                      <React.Fragment key={`group-${group.id}`}>
                        <SortableGroupRow
                          group={group}
                          projectId={projectId}
                          projectSchedule={projectSchedule}
                          isRosterCompleted={isRosterCompleted}
                          isExpanded={isExpanded}
                          onToggleExpansion={() => onToggleGroupExpansion?.(group.id)}
                          onRemoveGroup={() => onRemoveGroup?.(group.id)}
                          onEditGroup={onEditGroup ? () => onEditGroup(group.id) : undefined}
                          onPendingChange={onPendingChange}
                          onRegisterConfirm={onRegisterConfirm}
                          onUnregisterConfirm={onUnregisterConfirm}
                        />
                        
                        {/* Expanded group members */}
                        {isExpanded && group.members.map((member, index) => (
                          <TableRow key={`group-${group.id}-member-${index}`}>
                            <TableCell>
                              {/* Empty cell for drag handle column */}
                            </TableCell>
                            <TableCell className="pl-12">
                              <div>
                                <div className="text-sm font-medium">{member.name}</div>
                                <div className="text-xs text-muted-foreground">{member.role}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {/* Empty cell for schedule column */}
                            </TableCell>
                            <TableCell>
                              {/* No individual remove for group members */}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  }
                })}
              </SortableContext>
              {isReordering && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-2 text-sm text-muted-foreground">
                    Updating order...
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </DndContext>
  )
}