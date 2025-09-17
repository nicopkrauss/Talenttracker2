"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { EnhancedProject, TalentProfile, TalentGroup, ProjectSchedule } from '@/lib/types'
import { Plus, Search, Users, Check, UserPlus, ChevronDown, ChevronRight, Loader2, UserCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useReadiness } from '@/lib/contexts/readiness-context'
import { useRequestQueue } from '@/hooks/use-request-queue'
import { useOptimisticState } from '@/hooks/use-optimistic-state'
import { CSVImportDialog } from '@/components/talent/csv-import-dialog'
import { GroupCreationModal } from '@/components/projects/group-creation-modal'
import { GroupEditModal } from '@/components/projects/group-edit-modal'
import { GroupBadge } from '@/components/projects/group-badge'
import { TalentScheduleColumn } from '@/components/projects/talent-schedule-column'
import { DraggableTalentList } from '@/components/projects/draggable-talent-list'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'
import { TalentEmptyState } from '@/components/projects/empty-state-guidance'

interface TalentRosterTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

interface ProjectTalent extends TalentProfile {
  assignment?: {
    id: string
    status: string
    assigned_at: string
    scheduled_dates?: string[]
  }
}

interface AvailableTalent extends TalentProfile {
  // Available talent from the general talent database
}

interface ProjectReadiness {
  talent_finalized: boolean
  talent_status: 'none' | 'partial' | 'finalized'
}

export function TalentRosterTab({ project, onProjectUpdate }: TalentRosterTabProps) {
  const { toast } = useToast()
  const { readiness: cachedReadiness, canAccessFeature, invalidateReadiness } = useReadiness()
  
  // Feature availability is now handled by cached readiness data in EmptyStateGuidance
  
  // Enhanced state management with optimistic updates and request queuing
  const [serverAssignedTalent, setServerAssignedTalent] = useState<ProjectTalent[]>([])
  const [serverAvailableTalent, setServerAvailableTalent] = useState<AvailableTalent[]>([])
  const [serverTalentGroups, setServerTalentGroups] = useState<TalentGroup[]>([])
  
  const {
    data: assignedTalent,
    applyOptimisticUpdate: applyTalentOptimisticUpdate,
    forceSync: forceTalentSync,
    hasPendingOperations: hasPendingTalentOperations
  } = useOptimisticState(serverAssignedTalent, { syncDelayMs: 1500 })
  
  const {
    data: availableTalent,
    applyOptimisticUpdate: applyAvailableOptimisticUpdate,
    forceSync: forceAvailableSync
  } = useOptimisticState(serverAvailableTalent, { syncDelayMs: 1500 })
  
  const {
    data: talentGroups,
    applyOptimisticUpdate: applyGroupOptimisticUpdate,
    forceSync: forceGroupSync,
    hasPendingOperations: hasPendingGroupOperations
  } = useOptimisticState(serverTalentGroups, { syncDelayMs: 1500 })
  
  const {
    enqueueRequest,
    isRequestActive,
    cancelRequest,
    isProcessing,
    activeRequests
  } = useRequestQueue({
    maxConcurrent: 2,
    debounceMs: 200,
    retryAttempts: 2
  })
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [availableSearchQuery, setAvailableSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [showGroupEditDialog, setShowGroupEditDialog] = useState(false)
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<TalentGroup | null>(null)
  
  // Selection state for multi-select talent assignment
  const [selectedTalent, setSelectedTalent] = useState<Set<string>>(new Set())

  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Calculate project schedule for date selectors
  const projectSchedule: ProjectSchedule = createProjectScheduleFromStrings(
    project.start_date,
    project.end_date
  )
  
  // Track pending changes for confirm all functionality
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set())
  
  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // Collapsible section states
  const [isAssignTalentExpanded, setIsAssignTalentExpanded] = useState(true)
  const [isCurrentTalentAssignmentsExpanded, setIsCurrentTalentAssignmentsExpanded] = useState(true)
  
  // Form state for adding talent
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    rep_name: '',
    rep_email: '',
    rep_phone: '',
    notes: ''
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load assigned talent roster and groups (now unified)
      const rosterResponse = await fetch(`/api/projects/${project.id}/talent-roster`)
      let rosterData = null
      if (rosterResponse.ok) {
        rosterData = await rosterResponse.json()
        // Handle new unified response format
        if (rosterData.data && typeof rosterData.data === 'object') {
          setServerAssignedTalent(rosterData.data.talent || [])
          setServerTalentGroups(rosterData.data.groups || [])
        } else {
          // Fallback for old format
          setServerAssignedTalent(rosterData.data || [])
        }
      }

      // Load available talent from general database
      const availableResponse = await fetch('/api/talent')
      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        // Filter out talent already assigned to this project
        const assignedIds = new Set((rosterData?.data?.talent || rosterData?.data || []).map((t: ProjectTalent) => t.id))
        const unassignedTalent = (availableData.data || []).filter((t: AvailableTalent) => !assignedIds.has(t.id))
        setServerAvailableTalent(unassignedTalent)
      }

      // Readiness data is now provided by ReadinessProvider context
    } catch (error) {
      console.error('Error loading talent data:', error)
      toast({
        title: "Error",
        description: "Failed to load talent data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [project.id, toast])

  // Load talent roster and available talent
  useEffect(() => {
    loadData()
  }, [loadData])

  // Reload data without showing loading spinner
  const reloadDataSilently = useCallback(async () => {
    try {
      // Load assigned talent roster and groups (now unified)
      const rosterResponse = await fetch(`/api/projects/${project.id}/talent-roster`)
      let rosterData = null
      if (rosterResponse.ok) {
        rosterData = await rosterResponse.json()
        // Handle new unified response format
        if (rosterData.data && typeof rosterData.data === 'object') {
          setServerAssignedTalent(rosterData.data.talent || [])
          setServerTalentGroups(rosterData.data.groups || [])
        } else {
          // Fallback for old format
          setServerAssignedTalent(rosterData.data || [])
        }
      }

      // Load available talent from general database
      const availableResponse = await fetch('/api/talent')
      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        // Filter out talent already assigned to this project
        const assignedIds = new Set((rosterData?.data?.talent || rosterData?.data || []).map((t: ProjectTalent) => t.id))
        const unassignedTalent = (availableData.data || []).filter((t: AvailableTalent) => !assignedIds.has(t.id))
        setServerAvailableTalent(unassignedTalent)
      }
    } catch (error) {
      console.error('Error reloading talent data:', error)
    }
  }, [project.id])

  // Filter assigned talent by name only
  const filteredAssignedTalent = assignedTalent.filter((person) => {
    const fullName = `${person.first_name} ${person.last_name}`
    return fullName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Filter talent groups by name
  const filteredTalentGroups = talentGroups.filter((group) => {
    // Handle both camelCase (groupName) and snake_case (group_name) for compatibility
    const groupName = group.groupName || group.group_name || ''
    return groupName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Filter available talent by name only
  const filteredAvailableTalent = availableTalent.filter((person) => {
    const fullName = `${person.first_name} ${person.last_name}`
    return fullName.toLowerCase().includes(availableSearchQuery.toLowerCase())
  })

  const handleAssignTalent = useCallback(async (talentId: string) => {
    const talent = availableTalent.find(t => t.id === talentId)
    if (!talent || isRequestActive(talentId)) return

    enqueueRequest(
      talentId,
      async () => {
        // Calculate the next display_order (highest current + 1) from both talent and groups
        const maxTalentOrder = Math.max(
          ...assignedTalent.map(t => t.assignment?.display_order || 0),
          0
        )
        const maxGroupOrder = Math.max(
          ...talentGroups.map(g => g.display_order || g.displayOrder || 0),
          0
        )
        const maxDisplayOrder = Math.max(maxTalentOrder, maxGroupOrder)
        
        const optimisticAssignment: ProjectTalent = {
          id: talent.id, // Use real ID for optimistic update
          first_name: talent.first_name,
          last_name: talent.last_name,
          rep_name: talent.rep_name,
          rep_email: talent.rep_email,
          rep_phone: talent.rep_phone,
          notes: talent.notes,
          created_at: talent.created_at,
          updated_at: talent.updated_at,
          assignment: {
            id: `temp-assignment-${talentId}`,
            status: 'active',
            assigned_at: new Date().toISOString(),
            display_order: maxDisplayOrder + 1
          }
        }

        // Apply optimistic updates to both lists
        const assignedPromise = applyTalentOptimisticUpdate(
          `assign-${talentId}`,
          'add',
          (current) => [...current, optimisticAssignment],
          (current) => current.filter(t => t.id !== talentId),
          async () => {
            const response = await fetch(`/api/projects/${project.id}/talent-roster/assign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ talent_id: talentId })
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to assign talent')
            }

            return response.json()
          }
        )

        const availablePromise = applyAvailableOptimisticUpdate(
          `remove-available-${talentId}`,
          'remove',
          (current) => current.filter(t => t.id !== talentId),
          (current) => [...current, talent],
          async () => Promise.resolve() // No server operation needed for available list
        )

        await Promise.all([assignedPromise, availablePromise])

        toast({
          title: "Success",
          description: "Talent assigned to project"
        })

        // Trigger silent refresh after a delay to sync server state
        setTimeout(reloadDataSilently, 2000)
      },
      'add'
    )
  }, [availableTalent, assignedTalent, isRequestActive, enqueueRequest, applyTalentOptimisticUpdate, applyAvailableOptimisticUpdate, project.id, toast, reloadDataSilently])

  const handleRemoveTalent = useCallback(async (talentId: string) => {
    const talentToRemove = assignedTalent.find(t => t.id === talentId)
    if (!talentToRemove || isRequestActive(talentId)) return

    enqueueRequest(
      talentId,
      async () => {
        // Create talent to restore to available list
        const talentToRestore: AvailableTalent = {
          id: talentToRemove.id,
          first_name: talentToRemove.first_name,
          last_name: talentToRemove.last_name,
          rep_name: talentToRemove.rep_name,
          rep_email: talentToRemove.rep_email,
          rep_phone: talentToRemove.rep_phone,
          notes: talentToRemove.notes,
          created_at: talentToRemove.created_at,
          updated_at: talentToRemove.updated_at
        }

        // Apply optimistic updates to both lists
        const assignedPromise = applyTalentOptimisticUpdate(
          `remove-${talentId}`,
          'remove',
          (current) => current.filter(t => t.id !== talentId),
          (current) => [...current, talentToRemove],
          async () => {
            const response = await fetch(`/api/projects/${project.id}/talent-roster/${talentId}`, {
              method: 'DELETE'
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to remove talent')
            }

            return response.json()
          }
        )

        const availablePromise = applyAvailableOptimisticUpdate(
          `restore-available-${talentId}`,
          'add',
          (current) => [...current, talentToRestore],
          (current) => current.filter(t => t.id !== talentId),
          async () => Promise.resolve() // No server operation needed for available list
        )

        await Promise.all([assignedPromise, availablePromise])

        toast({
          title: "Success",
          description: "Talent removed from project"
        })

        // Trigger silent refresh after a delay to sync server state
        setTimeout(reloadDataSilently, 2000)
      },
      'remove'
    )
  }, [assignedTalent, isRequestActive, enqueueRequest, applyTalentOptimisticUpdate, applyAvailableOptimisticUpdate, project.id, toast, reloadDataSilently])

  const handleBulkAssignTalent = useCallback(async () => {
    if (selectedTalent.size === 0) return

    const selectedTalentArray = Array.from(selectedTalent)
    
    // Clear selection immediately for better UX
    setSelectedTalent(new Set())

    // Process assignments sequentially to avoid overwhelming the system
    let successCount = 0
    let errorCount = 0

    for (const talentId of selectedTalentArray) {
      try {
        await handleAssignTalent(talentId)
        successCount++
      } catch (error) {
        console.error(`Error assigning talent ${talentId}:`, error)
        errorCount++
      }
    }

    // Show appropriate toast message
    if (errorCount === 0) {
      toast({
        title: "Success",
        description: `Assigned ${successCount} talent to project`
      })
    } else if (successCount === 0) {
      toast({
        title: "Error",
        description: `Failed to assign ${errorCount} talent. Please try again.`,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Partial Success",
        description: `Assigned ${successCount} talent, ${errorCount} failed`,
        variant: "destructive"
      })
    }
  }, [selectedTalent, handleAssignTalent, toast])

  const handleAddTalent = async () => {
    if (!formData.first_name || !formData.last_name || !formData.rep_name || !formData.rep_email || !formData.rep_phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/talent-roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent added successfully"
        })
        setShowAddDialog(false)
        setFormData({
          first_name: '',
          last_name: '',
          rep_name: '',
          rep_email: '',
          rep_phone: '',
          notes: ''
        })
        await reloadDataSilently()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add talent')
      }
    } catch (error) {
      console.error('Error adding talent:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add talent",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveGroup = useCallback(async (groupId: string) => {
    const groupToRemove = talentGroups.find(g => g.id === groupId)
    if (!groupToRemove || isRequestActive(groupId)) return

    enqueueRequest(
      groupId,
      async () => {
        await applyGroupOptimisticUpdate(
          `remove-group-${groupId}`,
          'remove',
          (current) => current.filter(g => g.id !== groupId),
          (current) => [...current, groupToRemove],
          async () => {
            const response = await fetch(`/api/projects/${project.id}/talent-groups/${groupId}`, {
              method: 'DELETE'
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to remove talent group')
            }

            return response.json()
          }
        )

        toast({
          title: "Success",
          description: "Talent group removed from project"
        })

        // Trigger silent refresh after a delay to sync server state
        setTimeout(reloadDataSilently, 2000)
      },
      'remove'
    )
  }, [talentGroups, isRequestActive, enqueueRequest, applyGroupOptimisticUpdate, project.id, toast, reloadDataSilently])

  const handleEditGroup = (groupId: string) => {
    const group = talentGroups.find(g => g.id === groupId)
    if (group) {
      setSelectedGroupForEdit(group)
      setShowGroupEditDialog(true)
    }
  }

  const handlePendingChange = useCallback((talentId: string, hasPendingChanges: boolean) => {
    setPendingChanges(prev => {
      const newSet = new Set(prev)
      if (hasPendingChanges) {
        newSet.add(talentId)
      } else {
        newSet.delete(talentId)
      }
      return newSet
    })
  }, [])

  // Store confirm functions for each talent/group
  const [confirmFunctions, setConfirmFunctions] = useState<Map<string, () => Promise<void>>>(new Map())

  const registerConfirmFunction = useCallback((talentId: string, confirmFn: () => Promise<void>) => {
    setConfirmFunctions(prev => {
      const newMap = new Map(prev)
      newMap.set(talentId, confirmFn)
      return newMap
    })
  }, [])

  const unregisterConfirmFunction = useCallback((talentId: string) => {
    setConfirmFunctions(prev => {
      const newMap = new Map(prev)
      newMap.delete(talentId)
      return newMap
    })
  }, [])

  const handleConfirmAll = useCallback(async () => {
    const pendingIds = Array.from(pendingChanges)
    
    if (pendingIds.length === 0) {
      toast({
        title: "No Changes",
        description: "No pending schedule changes to confirm",
        variant: "default"
      })
      return
    }

    const results = await Promise.allSettled(
      pendingIds.map(async (id) => {
        const confirmFn = confirmFunctions.get(id)
        if (!confirmFn) {
          throw new Error(`No confirm function registered for ${id}`)
        }
        
        await confirmFn()
        return { id, success: true }
      })
    )

    const successful = results.filter(result => result.status === 'fulfilled')
    const failed = results.filter(result => result.status === 'rejected')

    if (failed.length === 0) {
      toast({
        title: "Success",
        description: `Confirmed ${successful.length} schedule changes`
      })
    } else if (successful.length === 0) {
      toast({
        title: "Error",
        description: `All ${failed.length} schedule updates failed`,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Partial Success",
        description: `${successful.length} confirmed, ${failed.length} failed`,
        variant: "destructive"
      })
    }
  }, [pendingChanges, confirmFunctions, toast])

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const handleFinalizeTalentRoster = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/readiness/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'talent' })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent roster finalized"
        })
        // Invalidate readiness cache to trigger refresh
        await invalidateReadiness('role_template_change')
        await onProjectUpdate()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to finalize talent roster')
      }
    } catch (error) {
      console.error('Error finalizing talent roster:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize talent roster",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Assign Talent Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer flex-1" 
              onClick={() => setIsAssignTalentExpanded(!isAssignTalentExpanded)}
            >
              {isAssignTalentExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <UserPlus className="h-5 w-5" />
              Assign Talent
              <Badge variant="secondary">{assignedTalent.length} assigned</Badge>
              <Badge variant="outline">{talentGroups.length} groups</Badge>
            </div>
            <div className="flex items-center gap-2">
              {isAssignTalentExpanded && (
                <>
                  <CSVImportDialog onImportComplete={reloadDataSilently} />

                  {selectedTalent.size > 0 ? (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkAssignTalent();
                      }} 
                      size="sm" 
                      className="gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      Assign Selected ({selectedTalent.size})
                    </Button>
                  ) : (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddDialog(true);
                      }} 
                      size="sm" 
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Talent
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {isAssignTalentExpanded && (
          <CardContent>
          {/* Search for available talent */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search available talent by name..."
                value={availableSearchQuery}
                onChange={(e) => setAvailableSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selection Controls */}
          {filteredAvailableTalent.length > 0 && (
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedTalent.size === filteredAvailableTalent.length && filteredAvailableTalent.length > 0) {
                      setSelectedTalent(new Set())
                    } else {
                      setSelectedTalent(new Set(filteredAvailableTalent.map(t => t.id)))
                    }
                  }}
                >
                  {selectedTalent.size === filteredAvailableTalent.length && filteredAvailableTalent.length > 0 ? 'Deselect All' : 'Select All'} ({filteredAvailableTalent.length})
                </Button>
                {selectedTalent.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTalent(new Set())}
                    >
                      Clear Selected
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedTalent.size} selected
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Available Talent Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[440px] overflow-y-auto">
            {filteredAvailableTalent.length === 0 ? (
              <div className="col-span-full">
                <TalentEmptyState
                  variant={availableTalent.length === 0 ? 'empty' : 'filtered'}
                  onNavigate={(route) => {
                    // Handle navigation - could integrate with router
                    console.log('Navigate to:', route)
                  }}
                />
              </div>
            ) : (
              filteredAvailableTalent.map((person) => {
                const isSelected = selectedTalent.has(person.id)
                return (
                  <Card 
                    key={person.id} 
                    className={`relative transition-all cursor-pointer border-2 py-0 ${isSelected
                      ? 'bg-card border-primary shadow-md'
                      : 'hover:shadow-md border-border hover:border-muted-foreground/20'
                    }`}
                    onClick={() => {
                      const newSelected = new Set(selectedTalent)
                      if (isSelected) {
                        newSelected.delete(person.id)
                      } else {
                        newSelected.add(person.id)
                      }
                      setSelectedTalent(newSelected)
                    }}
                  >
                    <CardContent className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-base leading-tight">
                            {person.first_name} {person.last_name}
                          </h4>
                        </div>
                        <Button 
                          size="sm" 
                          className="h-7 text-xs px-3"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent card selection when clicking assign button
                            handleAssignTalent(person.id)
                          }}
                          disabled={isRequestActive(person.id)}
                        >
                          {isRequestActive(person.id) ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Assigning...
                            </>
                          ) : (
                            'Assign'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </CardContent>
        )}
      </Card>

      {/* Current Talent Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer flex-1" 
              onClick={() => setIsCurrentTalentAssignmentsExpanded(!isCurrentTalentAssignmentsExpanded)}
            >
              {isCurrentTalentAssignmentsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Users className="h-5 w-5" />
              Current Talent Assignments
            </div>
            {/* Fixed button area to prevent layout shift */}
            <div className="flex items-center gap-2">
              {/* Show processing indicator */}
              {(isProcessing || hasPendingTalentOperations || hasPendingGroupOperations) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              )}
              
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGroupDialog(true);
                }} 
                size="sm" 
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Add Group
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {isCurrentTalentAssignmentsExpanded && (
          <CardContent>
          {/* Search for assigned talent */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search assigned talent by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>



          {/* Assigned Talent Table */}
          <DraggableTalentList
            talent={filteredAssignedTalent}
            projectId={project.id}
            projectSchedule={projectSchedule}
            isRosterCompleted={canAccessFeature('scheduling')}
            onRemoveTalent={handleRemoveTalent}
            onPendingChange={handlePendingChange}
            onRegisterConfirm={registerConfirmFunction}
            onUnregisterConfirm={unregisterConfirmFunction}
            talentGroups={filteredTalentGroups}
            expandedGroups={expandedGroups}
            onToggleGroupExpansion={toggleGroupExpansion}
            onRemoveGroup={handleRemoveGroup}
            onEditGroup={handleEditGroup}
            onReorderComplete={undefined}
            showEmptyState={filteredAssignedTalent.length === 0 && filteredTalentGroups.length === 0}
            emptyStateMessage={
              assignedTalent.length === 0 && talentGroups.length === 0 ? (
                <TalentEmptyState
                  variant="empty"
                  onNavigate={(route) => {
                    console.log('Navigate to:', route)
                  }}
                  featureAvailability={talentFeatureAvailability}
                />
              ) : (
                <TalentEmptyState
                  variant="filtered"
                  onNavigate={(route) => {
                    console.log('Navigate to:', route)
                  }}
                />
              )
            }
            // Pass request state for better UX
            isRequestActive={isRequestActive}
            activeRequests={activeRequests}
            // New props for confirm all functionality
            pendingChanges={pendingChanges}
            onConfirmAll={handleConfirmAll}
          />

        </CardContent>
        )}
      </Card>

      {/* Finalize Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleFinalizeTalentRoster}
          disabled={(assignedTalent.length === 0 && talentGroups.length === 0) || canAccessFeature('scheduling')}
          className="gap-2"
        >
          {canAccessFeature('scheduling') ? (
            <>
              <Check className="h-4 w-4" />
              Talent Roster Finalized
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Finalize Talent Roster
            </>
          )}
        </Button>
      </div>

      {/* Add Talent Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false)
          setFormData({
            first_name: '',
            last_name: '',
            rep_name: '',
            rep_email: '',
            rep_phone: '',
            notes: ''
          })
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Talent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rep_name">Representative Name *</Label>
              <Input
                id="rep_name"
                value={formData.rep_name}
                onChange={(e) => setFormData(prev => ({ ...prev, rep_name: e.target.value }))}
                placeholder="Representative name"
              />
            </div>
            <div>
              <Label htmlFor="rep_email">Representative Email *</Label>
              <Input
                id="rep_email"
                type="email"
                value={formData.rep_email}
                onChange={(e) => setFormData(prev => ({ ...prev, rep_email: e.target.value }))}
                placeholder="representative@example.com"
              />
            </div>
            <div>
              <Label htmlFor="rep_phone">Representative Phone *</Label>
              <Input
                id="rep_phone"
                value={formData.rep_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, rep_phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this talent..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTalent}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Talent'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Creation Modal */}
      <GroupCreationModal
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        projectId={project.id}
        onGroupCreated={reloadDataSilently}
      />

      {/* Group Edit Modal */}
      <GroupEditModal
        open={showGroupEditDialog}
        onOpenChange={setShowGroupEditDialog}
        projectId={project.id}
        group={selectedGroupForEdit}
        onGroupUpdated={reloadDataSilently}
      />

    </div>
  )
}