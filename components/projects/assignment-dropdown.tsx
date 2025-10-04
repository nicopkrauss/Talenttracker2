"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Search, ChevronDown, User, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EscortAvailabilityStatus, ProjectSchedule } from '@/lib/types'
import { getDayType } from '@/lib/schedule-utils'

interface AssignmentDropdownProps {
  talentId: string
  talentName: string
  isGroup: boolean
  currentEscortId?: string
  currentEscortName?: string
  availableEscorts: EscortAvailabilityStatus[]
  selectedDate: Date
  projectSchedule: ProjectSchedule
  onAssignmentChange: (talentId: string, escortId: string | null) => void
  onRemoveDropdown?: () => void
  disabled?: boolean
}

export function AssignmentDropdown({
  talentId,
  currentEscortId,
  currentEscortName,
  availableEscorts,
  selectedDate,
  projectSchedule,
  onAssignmentChange,
  onRemoveDropdown,
  disabled = false
}: AssignmentDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isCurrentDayAssignedOpen, setIsCurrentDayAssignedOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isXHovered, setIsXHovered] = useState(false)

  const dayType = getDayType(selectedDate, projectSchedule)
  const isShowDay = dayType === 'show'

  // Filter and organize escorts by section
  const organizedEscorts = useMemo(() => {
    const filtered = availableEscorts.filter(escort =>
      escort.escortName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Always show all sections - the issue was filtering out currentDayAssigned on show days
    return {
      available: filtered.filter(escort => escort.section === 'available'),
      rehearsalAssigned: filtered.filter(escort => escort.section === 'rehearsal_assigned'),
      currentDayAssigned: filtered.filter(escort => escort.section === 'current_day_assigned')
    }
  }, [availableEscorts, searchQuery])

  const handleAssignment = (escortId: string) => {
    onAssignmentChange(talentId, escortId)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClearAssignment = () => {
    console.log('🔥 CLEAR ASSIGNMENT CALLED')
    onAssignmentChange(talentId, null)
    setIsOpen(false)
  }



  const getButtonText = () => {
    if (currentEscortName) {
      return currentEscortName
    }
    return 'Select Escort'
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="relative flex"
        onMouseEnter={() => {
          console.log('🔥 MOUSE ENTER - Setting isHovered to true')
          setIsHovered(true)
        }}
        onMouseLeave={() => {
          console.log('🔥 MOUSE LEAVE - Setting isHovered to false')
          setIsHovered(false)
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 min-w-fit ml-auto",
              currentEscortName
                ? "!bg-white !text-black !border-gray-300 hover:!bg-gray-50 hover:!text-black dark:!bg-white dark:!text-black dark:!border-gray-300 dark:hover:!bg-gray-50 dark:hover:!text-black rounded-r-none border-r-0 pr-0"
                : "justify-between"
            )}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">{getButtonText()}</span>
            </div>

            {/* Only show chevron when no escort is selected */}
            {!currentEscortName && <ChevronDown className="h-4 w-4 flex-shrink-0" />}
          </Button>
        </DropdownMenuTrigger>

        {/* Separate X button outside DropdownMenuTrigger when escort is selected */}
        {currentEscortName && (
          <button
            onClick={(e) => {
              console.log('🔥 SEPARATE X BUTTON CLICKED')
              e.preventDefault()
              e.stopPropagation()
              handleClearAssignment()
            }}
            onMouseEnter={() => setIsXHovered(true)}
            onMouseLeave={() => setIsXHovered(false)}
            disabled={disabled}
            className={cn(
              "border border-l-0 rounded-l-none rounded-r-md px-1.5 flex items-center justify-center transition-all duration-200",
              "!bg-white !text-black !border-gray-300 dark:!bg-white dark:!text-black dark:!border-gray-300"
            )}
          >
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200"
              style={{
                backgroundColor: isXHovered ? 'rgba(0, 0, 0, 0.15)' : 'transparent'
              }}
            >
              {isHovered ? (
                <X className="h-4 w-4 text-black" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
        )}
      </div>

      <DropdownMenuContent className="w-56" align="start">
        {/* Search Input */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search escorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>

        {/* Clear Assignment Option */}
        {currentEscortId && (
          <>
            <DropdownMenuItem
              onClick={handleClearAssignment}
              className="text-destructive focus:text-destructive"
            >
              <X className="h-3 w-3 mr-2" />
              Clear Assignment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Available Escorts */}
        {organizedEscorts.available.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium text-green-600 dark:text-green-400">
              Available
            </DropdownMenuLabel>
            {organizedEscorts.available.map((escort) => (
              <DropdownMenuItem
                key={escort.escortId}
                onClick={() => handleAssignment(escort.escortId)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{escort.escortName}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Already Assigned Rehearsal Day (only for rehearsal days) */}
        {!isShowDay && organizedEscorts.rehearsalAssigned.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              Already Assigned Rehearsal Day
            </DropdownMenuLabel>
            {organizedEscorts.rehearsalAssigned.map((escort) => (
              <DropdownMenuItem
                key={escort.escortId}
                onClick={() => handleAssignment(escort.escortId)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="flex-1">
                    <div className="font-medium">{escort.escortName}</div>
                    {escort.currentAssignment && (
                      <div className="text-xs text-muted-foreground">
                        {escort.currentAssignment.talentName === 'Floater' 
                          ? 'is a floater' 
                          : `with ${escort.currentAssignment.talentName}`}
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Already Assigned for Current Day - Collapsible */}
        {organizedEscorts.currentDayAssigned.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Collapsible open={isCurrentDayAssignedOpen} onOpenChange={setIsCurrentDayAssignedOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-destructive hover:bg-accent cursor-pointer">
                  <span>Already Assigned for {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${isCurrentDayAssignedOpen ? 'rotate-90' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {organizedEscorts.currentDayAssigned.map((escort) => (
                  <DropdownMenuItem
                    key={escort.escortId}
                    onClick={() => handleAssignment(escort.escortId)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="flex-1">
                        <div className="font-medium">{escort.escortName}</div>
                        {escort.currentAssignment && (
                          <div className="text-xs text-muted-foreground">
                            {escort.currentAssignment.talentName === 'Floater' 
                              ? 'is a floater' 
                              : `with ${escort.currentAssignment.talentName}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* No Results */}
        {organizedEscorts.available.length === 0 &&
          organizedEscorts.rehearsalAssigned.length === 0 &&
          organizedEscorts.currentDayAssigned.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No escorts found matching your search.' : 'No escorts available.'}
            </div>
          )}

        {/* Remove Escort Field Option */}
        {onRemoveDropdown && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onRemoveDropdown()
                setIsOpen(false)
              }}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <X className="h-3 w-3 mr-2" />
              Remove Escort Field
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}