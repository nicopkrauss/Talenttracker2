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
import { Plus, Search, Users, Check, UserPlus, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CSVImportDialog } from '@/components/talent/csv-import-dialog'
import { GroupCreationModal } from '@/components/projects/group-creation-modal'
import { GroupEditModal } from '@/components/projects/group-edit-modal'
import { GroupBadge } from '@/components/projects/group-badge'
import { TalentScheduleColumn } from '@/components/projects/talent-schedule-column'
import { DraggableTalentList } from '@/components/projects/draggable-talent-list'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'

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

export function TalentRosterTab({ project, onProjectUpdate }: TalentRosterTabProps) {
  const { toast } = useToast()
  const [assignedTalent, setAssignedTalent] = useState<ProjectTalent[]>([])
  const [availableTalent, setAvailableTalent] = useState<AvailableTalent[]>([])
  const [talentGroups, setTalentGroups] = useState<TalentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [availableSearchQuery, setAvailableSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [showGroupEditDialog, setShowGroupEditDialog] = useState(false)
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<TalentGroup | null>(null)

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
          setAssignedTalent(rosterData.data.talent || [])
          setTalentGroups(rosterData.data.groups || [])
        } else {
          // Fallback for old format
          setAssignedTalent(rosterData.data || [])
        }
      }

      // Load available talent from general database
      const availableResponse = await fetch('/api/talent')
      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        // Filter out talent already assigned to this project
        const assignedIds = new Set((rosterData?.data?.talent || rosterData?.data || []).map((t: ProjectTalent) => t.id))
        const unassignedTalent = (availableData.data || []).filter((t: AvailableTalent) => !assignedIds.has(t.id))
        setAvailableTalent(unassignedTalent)
      }
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
  }, [project.id])

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
          setAssignedTalent(rosterData.data.talent || [])
          setTalentGroups(rosterData.data.groups || [])
        } else {
          // Fallback for old format
          setAssignedTalent(rosterData.data || [])
        }
      }

      // Load available talent from general database
      const availableResponse = await fetch('/api/talent')
      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        // Filter out talent already assigned to this project
        const assignedIds = new Set((rosterData?.data?.talent || rosterData?.data || []).map((t: ProjectTalent) => t.id))
        const unassignedTalent = (availableData.data || []).filter((t: AvailableTalent) => !assignedIds.has(t.id))
        setAvailableTalent(unassignedTalent)
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

  const handleAssignTalent = async (talentId: string) => {
    const talent = availableTalent.find(t => t.id === talentId)
    if (!talent) return

    // Optimistic update - create temporary assignment
    const optimisticAssignment = {
      id: `temp-${talentId}`,
      first_name: talent.first_name,
      last_name: talent.last_name,
      rep_name: talent.rep_name,
      rep_email: talent.rep_email,
      rep_phone: talent.rep_phone,
      notes: talent.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignment: {
        id: `temp-assignment-${talentId}`,
        status: 'active',
        assigned_at: new Date().toISOString()
      }
    }

    // Add optimistic assignment and remove from available talent
    setAssignedTalent(prev => [...prev, optimisticAssignment])
    setAvailableTalent(prev => prev.filter(t => t.id !== talentId))

    try {
      const response = await fetch(`/api/projects/${project.id}/talent-roster/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talent_id: talentId })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent assigned to project"
        })
        // Silent refresh to get real IDs and sync server state
        await reloadDataSilently()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign talent')
      }
    } catch (error) {
      console.error('Error assigning talent:', error)
      
      // Revert optimistic updates on error
      setAssignedTalent(prev => prev.filter(t => t.id !== `temp-${talentId}`))
      setAvailableTalent(prev => [...prev, talent])
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign talent",
        variant: "destructive"
      })
    }
  }

  const handleRemoveTalent = async (talentId: string) => {
    // Find the talent being removed
    const talentToRemove = assignedTalent.find(t => t.id === talentId)
    if (!talentToRemove) return

    // Optimistically remove from assigned talent
    setAssignedTalent(prev => prev.filter(t => t.id !== talentId))
    
    // Optimistically add back to available talent
    const talentToRestore = {
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
    setAvailableTalent(prev => [...prev, talentToRestore])

    try {
      const response = await fetch(`/api/projects/${project.id}/talent-roster/${talentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent removed from project"
        })
        // Silent refresh to sync any server-side changes
        await reloadDataSilently()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove talent')
      }
    } catch (error) {
      console.error('Error removing talent:', error)
      
      // Revert optimistic updates on error
      setAssignedTalent(prev => [...prev, talentToRemove])
      setAvailableTalent(prev => prev.filter(t => t.id !== talentId))
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove talent",
        variant: "destructive"
      })
    }
  }

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

  const handleRemoveGroup = async (groupId: string) => {
    // Find the group being removed
    const groupToRemove = talentGroups.find(g => g.id === groupId)
    if (!groupToRemove) return

    // Optimistically remove from groups
    setTalentGroups(prev => prev.filter(g => g.id !== groupId))

    try {
      const response = await fetch(`/api/projects/${project.id}/talent-groups/${groupId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent group removed from project"
        })
        // Silent refresh to sync any server-side changes
        await reloadDataSilently()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove talent group')
      }
    } catch (error) {
      console.error('Error removing talent group:', error)
      
      // Revert optimistic update on error
      setTalentGroups(prev => [...prev, groupToRemove])
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove talent group",
        variant: "destructive"
      })
    }
  }

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
    const promises = pendingIds.map(id => {
      const confirmFn = confirmFunctions.get(id)
      return confirmFn ? confirmFn() : Promise.resolve()
    })
    
    try {
      await Promise.all(promises)
      toast({
        title: "Success",
        description: `Confirmed ${pendingIds.length} schedule changes`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Some schedule updates failed",
        variant: "destructive"
      })
    }
  }, [pendingChanges, confirmFunctions])

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
      const response = await fetch(`/api/projects/${project.id}/talent-roster/complete`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent roster finalized"
        })
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
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGroupDialog(true);
                    }} 
                    size="sm" 
                    variant="outline"
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Add Group
                  </Button>
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

          {/* Available Talent Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[440px] overflow-y-auto">
            {filteredAvailableTalent.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {availableTalent.length === 0 ? (
                  <p>No available talent found. Add new talent to get started.</p>
                ) : (
                  <p>No available talent match your search.</p>
                )}
              </div>
            ) : (
              filteredAvailableTalent.map((person) => (
                <Card key={person.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="px-4 py-3">
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
                        onClick={() => handleAssignTalent(person.id)}
                      >
                        Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
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
              {pendingChanges.size > 0 ? (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmAll();
                  }}
                  className="gap-2"
                  size="sm"
                >
                  <Check className="h-4 w-4" />
                  Confirm All ({pendingChanges.size})
                </Button>
              ) : (
                // Invisible placeholder with exact button dimensions to maintain layout
                <Button
                  className="gap-2 invisible"
                  size="sm"
                  disabled
                >
                  <Check className="h-4 w-4" />
                  Confirm All (0)
                </Button>
              )}
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
            isRosterCompleted={project.project_setup_checklist?.talent_roster_completed}
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
                <div>
                  <p>No talent or groups assigned to this project yet.</p>
                  <p className="text-sm mt-1">Assign talent from the available talent above or add new talent/groups.</p>
                </div>
              ) : (
                <p>No assigned talent or groups match your search.</p>
              )
            }
          />

        </CardContent>
        )}
      </Card>

      {/* Finalize Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleFinalizeTalentRoster}
          disabled={(assignedTalent.length === 0 && talentGroups.length === 0) || project.project_setup_checklist?.talent_roster_completed}
          className="gap-2"
        >
          {project.project_setup_checklist?.talent_roster_completed ? (
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