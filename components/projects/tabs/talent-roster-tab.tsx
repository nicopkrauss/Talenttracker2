"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { EnhancedProject, TalentProfile } from '@/lib/types'
import { Plus, Search, Users, Check, Trash2, UserPlus, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CSVImportDialog } from '@/components/talent/csv-import-dialog'

interface TalentRosterTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

interface ProjectTalent extends TalentProfile {
  assignment?: {
    id: string
    status: string
    assigned_at: string
  }
}

interface AvailableTalent extends TalentProfile {
  // Available talent from the general talent database
}

export function TalentRosterTab({ project, onProjectUpdate }: TalentRosterTabProps) {
  const { toast } = useToast()
  const [assignedTalent, setAssignedTalent] = useState<ProjectTalent[]>([])
  const [availableTalent, setAvailableTalent] = useState<AvailableTalent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [availableSearchQuery, setAvailableSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  
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

  // Load talent roster and available talent
  useEffect(() => {
    loadData()
  }, [project.id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load assigned talent roster
      const rosterResponse = await fetch(`/api/projects/${project.id}/talent-roster`)
      let rosterData = null
      if (rosterResponse.ok) {
        rosterData = await rosterResponse.json()
        setAssignedTalent(rosterData.data || [])
      }

      // Load available talent from general database
      const availableResponse = await fetch('/api/talent')
      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        // Filter out talent already assigned to this project
        const assignedIds = new Set((rosterData?.data || []).map((t: ProjectTalent) => t.id))
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
  }

  // Reload data without showing loading spinner
  const reloadDataSilently = async () => {
    try {
      // Load assigned talent roster
      const rosterResponse = await fetch(`/api/projects/${project.id}/talent-roster`)
      let rosterData = null
      if (rosterResponse.ok) {
        rosterData = await rosterResponse.json()
        setAssignedTalent(rosterData.data || [])
      }

      // Load available talent from general database
      const availableResponse = await fetch('/api/talent')
      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        // Filter out talent already assigned to this project
        const assignedIds = new Set((rosterData?.data || []).map((t: ProjectTalent) => t.id))
        const unassignedTalent = (availableData.data || []).filter((t: AvailableTalent) => !assignedIds.has(t.id))
        setAvailableTalent(unassignedTalent)
      }
    } catch (error) {
      console.error('Error reloading talent data:', error)
    }
  }

  // Filter assigned talent by name only
  const filteredAssignedTalent = assignedTalent.filter((person) => {
    const fullName = `${person.first_name} ${person.last_name}`
    return fullName.toLowerCase().includes(searchQuery.toLowerCase())
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
            </div>
            <div className="flex items-center gap-2">
              {isAssignTalentExpanded && (
                <>
                  <CSVImportDialog onImportComplete={reloadDataSilently} />
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
        <CardHeader className="cursor-pointer" onClick={() => setIsCurrentTalentAssignmentsExpanded(!isCurrentTalentAssignmentsExpanded)}>
          <CardTitle className="flex items-center gap-2">
            {isCurrentTalentAssignmentsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Users className="h-5 w-5" />
            Current Talent Assignments
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Representative</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignedTalent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {assignedTalent.length === 0 ? (
                      <div>
                        <p>No talent assigned to this project yet.</p>
                        <p className="text-sm mt-1">Assign talent from the available talent above or add new talent.</p>
                      </div>
                    ) : (
                      <p>No assigned talent match your search.</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignedTalent.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{person.first_name} {person.last_name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{person.rep_name}</div>
                        <div className="text-sm text-muted-foreground">{person.rep_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {person.assignment?.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTalent(person.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        )}
      </Card>

      {/* Finalize Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleFinalizeTalentRoster}
          disabled={assignedTalent.length === 0 || project.project_setup_checklist?.talent_roster_completed}
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


    </div>
  )
}