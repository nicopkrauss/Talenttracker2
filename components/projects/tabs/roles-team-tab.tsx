"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import {
  EnhancedProject,
  TeamAssignment,
  AvailableStaff,
  StaffFilter,
  AssignmentSummary,
  RoleDefinition,
  ProjectRole,
  ProjectRoleTemplate
} from '@/lib/types'
import { getRoleDisplayName } from '@/lib/role-utils'
import { Search, Users, DollarSign, Plus, X, Check, ArrowUp, ArrowDown, MapPin, Plane, ChevronDown, ChevronRight, Edit, FileText, UserPlus, Calendar, CalendarDays } from 'lucide-react'
import { TrashButton } from '@/components/ui/trash-button'
import { useToast } from '@/hooks/use-toast'
import { useReadiness } from '@/lib/contexts/readiness-context'
import { ProjectRoleTemplateManager, ProjectRoleTemplateManagerRef } from '@/components/projects/project-role-template-manager'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AvailabilityPopup } from '@/components/projects/availability-popup'
import { MassAvailabilityPopup } from '@/components/projects/mass-availability-popup'
import { ProjectSchedule } from '@/lib/types'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'
import { TeamEmptyState } from '@/components/projects/empty-state-guidance'

interface RolesTeamTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

// Role color mapping function
const getRoleColor = (role: string | null): string => {
  switch (role) {
    case 'admin':
      return 'bg-slate-900 text-slate-50 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
    case 'in_house':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
    case 'supervisor':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800'
    case 'coordinator':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800'
    case 'talent_escort':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-800'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}



interface ProjectReadiness {
  team_finalized: boolean
  team_status: 'none' | 'partial' | 'finalized'
}

export function RolesTeamTab({ project, onProjectUpdate }: RolesTeamTabProps) {
  const { toast } = useToast()
  const { readiness: cachedReadiness, canAccessFeature, invalidateReadiness } = useReadiness()
  
  // Feature availability is now handled by cached readiness data in EmptyStateGuidance
  const roleTemplateManagerRef = React.useRef<ProjectRoleTemplateManagerRef>(null)
  const [assignments, setAssignments] = useState<TeamAssignment[]>([])
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([])
  const [roleTemplates, setRoleTemplates] = useState<ProjectRoleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())
  const [bulkRole, setBulkRole] = useState<ProjectRole | ''>('')
  const [filters, setFilters] = useState<StaffFilter>({
    search: '',
    role: null,
    location: null,
    status: null,
    willing_to_fly: null,
    sort_by: 'full_name',
    sort_order: 'asc'
  })
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ pay_rate?: number; schedule_notes?: string }>({})
  const [isRoleTemplatesExpanded, setIsRoleTemplatesExpanded] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [individualAssignOpen, setIndividualAssignOpen] = useState<string | null>(null)
  const [individualTemplateId, setIndividualTemplateId] = useState<string>('')
  const [individualPayRate, setIndividualPayRate] = useState<number | ''>('')
  const [editPopoverOpen, setEditPopoverOpen] = useState<string | null>(null)
  const [allUserAssignments, setAllUserAssignments] = useState<TeamAssignment[]>([])

  // Collapsible section states
  const [isAssignStaffExpanded, setIsAssignStaffExpanded] = useState(true)
  const [isCurrentAssignmentsExpanded, setIsCurrentAssignmentsExpanded] = useState(true)
  const [isConfirmedAssignmentsExpanded, setIsConfirmedAssignmentsExpanded] = useState(true)

  // Availability popup state
  const [availabilityPopupOpen, setAvailabilityPopupOpen] = useState(false)
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamAssignment | null>(null)
  const [projectSchedule, setProjectSchedule] = useState<ProjectSchedule | null>(null)
  const [isConfirmingAvailability, setIsConfirmingAvailability] = useState(false)

  // Mass confirm popup state
  const [massConfirmPopupOpen, setMassConfirmPopupOpen] = useState(false)
  const [isMassConfirming, setIsMassConfirming] = useState(false)

  // Assignment filters and selection
  const [assignmentFilters, setAssignmentFilters] = useState({
    search: '',
    role: 'all',
    city: 'all',
    flight_willingness: 'all',
    sort_by: 'name',
    sort_order: 'asc' as 'asc' | 'desc'
  })
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set())
  const [bulkPayRate, setBulkPayRate] = useState<number | ''>('')
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null)

  // Confirmed team member bulk selection
  const [selectedConfirmedAssignments, setSelectedConfirmedAssignments] = useState<Set<string>>(new Set())
  const [isBulkActionInProgress, setIsBulkActionInProgress] = useState(false)

  // Role definitions based on role templates
  const roleDefinitions: RoleDefinition[] = useMemo(() => {
    return roleTemplates.map(template => ({
      role: template.role,
      displayName: template.display_name,
      basePayRate: template.base_pay_rate,
      timeType: template.time_type === 'daily' ? 'Daily' : 'Hourly',
      assignmentCount: assignments.filter(a => a.role === template.role).length
    }))
  }, [roleTemplates, assignments])

  // Assignment summary calculation
  const assignmentSummary: AssignmentSummary = useMemo(() => {
    const supervisorCount = assignments.filter(a => a.role === 'supervisor').length
    const tlcCount = assignments.filter(a => a.role === 'coordinator').length
    const escortCount = assignments.filter(a => a.role === 'talent_escort').length

    // Calculate estimated daily cost
    const supervisorCost = supervisorCount * 300
    const tlcCost = tlcCount * 350
    const escortCost = escortCount * 20 * 12 // Assuming 12-hour day for escorts

    return {
      supervisorCount,
      tlcCount,
      escortCount,
      totalStaffAssigned: assignments.length,
      estimatedDailyCost: supervisorCost + tlcCost + escortCost
    }
  }, [assignments])

  // Get unique values for filter options
  const uniqueLocations = useMemo(() => {
    const locations = availableStaff
      .map(staff => staff.nearest_major_city)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
    return locations.sort()
  }, [availableStaff])

  // Filtered and sorted staff based on current filters
  const filteredStaff = useMemo(() => {
    let filtered = availableStaff.filter(staff => {
      if (filters.search && !staff.full_name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !staff.email.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.role && staff.role !== filters.role) {
        return false
      }
      if (filters.location && staff.nearest_major_city !== filters.location) {
        return false
      }
      if (filters.status && staff.status !== filters.status) {
        return false
      }
      if (filters.willing_to_fly !== null && staff.willing_to_fly !== filters.willing_to_fly) {
        return false
      }
      return true
    })

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (filters.sort_by) {
        case 'full_name':
          aValue = a.full_name.toLowerCase()
          bValue = b.full_name.toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'nearest_major_city':
          aValue = a.nearest_major_city?.toLowerCase() || ''
          bValue = b.nearest_major_city?.toLowerCase() || ''
          break
        case 'role':
          aValue = a.role || ''
          bValue = b.role || ''
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        default:
          aValue = a.full_name.toLowerCase()
          bValue = b.full_name.toLowerCase()
      }

      if (aValue < bValue) return filters.sort_order === 'asc' ? -1 : 1
      if (aValue > bValue) return filters.sort_order === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [availableStaff, filters])

  // Filtered and sorted assignments (pending only for this section)
  const filteredPendingAssignments = useMemo(() => {
    let filtered = assignments.filter(assignment => {
      // Only show pending assignments (not confirmed)
      if (assignment.confirmed_at) return false
      const matchesSearch = assignmentFilters.search === '' ||
        assignment.profiles.full_name.toLowerCase().includes(assignmentFilters.search.toLowerCase()) ||
        assignment.profiles.email.toLowerCase().includes(assignmentFilters.search.toLowerCase())

      const matchesRole = assignmentFilters.role === 'all' || assignment.role === assignmentFilters.role

      const matchesCity = assignmentFilters.city === 'all' ||
        assignment.profiles.nearest_major_city === assignmentFilters.city

      const matchesFlight = assignmentFilters.flight_willingness === 'all' ||
        (assignmentFilters.flight_willingness === 'yes' && assignment.profiles.willing_to_fly) ||
        (assignmentFilters.flight_willingness === 'no' && !assignment.profiles.willing_to_fly)

      return matchesSearch && matchesRole && matchesCity && matchesFlight
    })

    // Sort assignments
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (assignmentFilters.sort_by) {
        case 'name':
          aValue = a.profiles.full_name
          bValue = b.profiles.full_name
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'pay_rate':
          aValue = a.pay_rate || 0
          bValue = b.pay_rate || 0
          break
        case 'city':
          aValue = a.profiles.nearest_major_city || ''
          bValue = b.profiles.nearest_major_city || ''
          break
        default:
          aValue = a.profiles.full_name
          bValue = b.profiles.full_name
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return assignmentFilters.sort_order === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [assignments, assignmentFilters])

  // Filtered and sorted confirmed assignments
  const filteredConfirmedAssignments = useMemo(() => {
    let filtered = assignments.filter(assignment => {
      // Only show confirmed assignments
      if (!assignment.confirmed_at) return false
      
      const matchesSearch = assignmentFilters.search === '' ||
        assignment.profiles.full_name.toLowerCase().includes(assignmentFilters.search.toLowerCase()) ||
        assignment.profiles.email.toLowerCase().includes(assignmentFilters.search.toLowerCase())

      const matchesRole = assignmentFilters.role === 'all' || assignment.role === assignmentFilters.role

      const matchesCity = assignmentFilters.city === 'all' ||
        assignment.profiles.nearest_major_city === assignmentFilters.city

      const matchesFlight = assignmentFilters.flight_willingness === 'all' ||
        (assignmentFilters.flight_willingness === 'yes' && assignment.profiles.willing_to_fly) ||
        (assignmentFilters.flight_willingness === 'no' && !assignment.profiles.willing_to_fly)

      return matchesSearch && matchesRole && matchesCity && matchesFlight
    })

    // Sort assignments
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (assignmentFilters.sort_by) {
        case 'name':
          aValue = a.profiles.full_name
          bValue = b.profiles.full_name
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'pay_rate':
          aValue = a.pay_rate || 0
          bValue = b.pay_rate || 0
          break
        case 'city':
          aValue = a.profiles.nearest_major_city || ''
          bValue = b.profiles.nearest_major_city || ''
          break
        default:
          aValue = a.profiles.full_name
          bValue = b.profiles.full_name
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return assignmentFilters.sort_order === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [assignments, assignmentFilters])

  // Get unique values for assignment filter options
  const assignmentFilterOptions = useMemo(() => {
    const roles = [...new Set(assignments.map(a => a.role))].filter(Boolean)
    const cities = [...new Set(assignments.map(a => a.profiles.nearest_major_city))].filter(Boolean)

    return { roles, cities }
  }, [assignments])

  // Get project assignments for a user (from all projects)
  const getUserProjectAssignments = (userId: string) => {
    return allUserAssignments.filter(assignment => assignment.user_id === userId)
  }

  // Load team assignments and available staff
  useEffect(() => {
    loadData()
    
    // Calculate project schedule
    if (project.start_date && project.end_date) {
      try {
        const schedule = createProjectScheduleFromStrings(project.start_date, project.end_date)
        setProjectSchedule(schedule)
      } catch (error) {
        console.error('Error creating project schedule:', error)
      }
    }
  }, [project.id, project.start_date, project.end_date])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load team assignments
      const assignmentsResponse = await fetch(`/api/projects/${project.id}/team-assignments`)
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        setAssignments(assignmentsData.assignments || [])
      }

      // Load available staff
      const staffResponse = await fetch(`/api/projects/${project.id}/available-staff`)
      if (staffResponse.ok) {
        const staffData = await staffResponse.json()
        setAvailableStaff(staffData.staff || [])
      }

      // Load role templates
      const templatesResponse = await fetch(`/api/projects/${project.id}/role-templates`)
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setRoleTemplates(templatesData.roleTemplates || [])
      }

      // Load all user assignments (for project badge functionality) - with better error handling
      try {
        const allAssignmentsResponse = await fetch(`/api/team-assignments`)
        if (allAssignmentsResponse.ok) {
          const allAssignmentsData = await allAssignmentsResponse.json()
          setAllUserAssignments(allAssignmentsData.assignments || [])
        } else {
          // Don't log warnings for expected permission errors
          if (allAssignmentsResponse.status !== 403) {
            console.warn('Failed to load all user assignments:', allAssignmentsResponse.status)
          }
          setAllUserAssignments([]) // Fallback to empty array
        }
      } catch (assignmentError) {
        // Silently handle network errors to prevent console spam
        setAllUserAssignments([]) // Fallback to empty array
      }

      // Readiness data is now provided by ReadinessProvider context
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Reload data without showing loading spinner
  const reloadDataSilently = async () => {
    try {
      // Load team assignments
      const assignmentsResponse = await fetch(`/api/projects/${project.id}/team-assignments`)
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        setAssignments(assignmentsData.assignments || [])
      }

      // Load available staff
      const staffResponse = await fetch(`/api/projects/${project.id}/available-staff`)
      if (staffResponse.ok) {
        const staffData = await staffResponse.json()
        setAvailableStaff(staffData.staff || [])
      }

      // Load role templates
      const templatesResponse = await fetch(`/api/projects/${project.id}/role-templates`)
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setRoleTemplates(templatesData.roleTemplates || [])
      }
    } catch (error) {
      console.error('Error reloading data:', error)
    }
  }

  const handleBulkAssign = async () => {
    if (!bulkRole || selectedStaff.size === 0) return

    setIsAssigning(true)

    // Store selected staff data for potential rollback
    const selectedStaffArray = Array.from(selectedStaff)
    const selectedStaffData = selectedStaffArray.map(userId =>
      availableStaff.find(s => s.id === userId)
    ).filter(Boolean)

    // Find the template for the selected role to get the base pay rate
    const selectedTemplate = roleTemplates.find(t => t.role === bulkRole)

    // Optimistic update - create temporary assignments
    const optimisticAssignments = selectedStaffArray.map(userId => {
      const staff = availableStaff.find(s => s.id === userId)
      return {
        id: `temp-${userId}`, // Temporary ID
        user_id: userId,
        role: bulkRole,
        project_id: project.id,
        pay_rate: selectedTemplate?.base_pay_rate || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: {
          id: userId,
          full_name: staff?.full_name || '',
          email: staff?.email || '',
          nearest_major_city: staff?.nearest_major_city,
          willing_to_fly: staff?.willing_to_fly
        }
      }
    })

    // Add optimistic assignments to current assignments
    setAssignments(prev => [...prev, ...optimisticAssignments])

    // Remove assigned staff from available staff list immediately
    setAvailableStaff(prev => prev.filter(staff => !selectedStaff.has(staff.id)))

    // Clear selection immediately for better UX
    setSelectedStaff(new Set())
    setBulkRole('')

    try {
      // Find the template for the selected role to get the base pay rate
      const selectedTemplate = roleTemplates.find(t => t.role === bulkRole)

      const promises = selectedStaffArray.map(userId =>
        fetch(`/api/projects/${project.id}/team-assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            role: bulkRole,
            pay_rate: selectedTemplate?.base_pay_rate || undefined
          })
        })
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `Assigned ${selectedStaffArray.length} staff members to ${getRoleDisplayName(bulkRole)}`,
      })

      // Reload data silently to get real IDs and any server-side updates
      await reloadDataSilently()
    } catch (error) {
      console.error('Error bulk assigning:', error)

      // Revert optimistic updates on error
      setAssignments(prev => prev.filter(a => !a.id.startsWith('temp-')))

      // Restore staff to available list
      setAvailableStaff(prev => [...prev, ...selectedStaffData])

      toast({
        title: "Error",
        description: "Failed to assign staff members",
        variant: "destructive"
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleQuickAssign = async (userId: string) => {
    const staff = availableStaff.find(s => s.id === userId)
    if (!staff) return

    // Find default template for user's system role
    let defaultTemplate = roleTemplates.find(t => t.role === staff.role && t.is_default)

    // If no default template for their system role, try to find any default template
    if (!defaultTemplate) {
      defaultTemplate = roleTemplates.find(t => t.is_default)
    }

    // If still no default template, use the first available template
    if (!defaultTemplate) {
      defaultTemplate = roleTemplates[0]
    }

    if (!defaultTemplate) {
      toast({
        title: "No Role Templates",
        description: "No role templates are configured for this project. Please set up role templates first.",
        variant: "destructive"
      })
      return
    }

    // Optimistic update - create temporary assignment
    const optimisticAssignment = {
      id: `temp-${userId}`,
      user_id: userId,
      role: defaultTemplate.role,
      project_id: project.id,
      pay_rate: defaultTemplate.base_pay_rate || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: {
        id: userId,
        full_name: staff.full_name,
        email: staff.email,
        nearest_major_city: staff.nearest_major_city,
        willing_to_fly: staff.willing_to_fly
      }
    }

    // Add optimistic assignment and remove from available staff
    setAssignments(prev => [...prev, optimisticAssignment])
    setAvailableStaff(prev => prev.filter(s => s.id !== userId))

    try {
      const response = await fetch(`/api/projects/${project.id}/team-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role: defaultTemplate.role,
          pay_rate: defaultTemplate.base_pay_rate || undefined
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Assigned ${staff.full_name} to ${defaultTemplate.display_name}`,
        })
        // Silent refresh to get real ID and sync server state
        await reloadDataSilently()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to assign staff member`)
      }
    } catch (error) {
      console.error('Error assigning staff:', error)

      // Revert optimistic updates on error
      setAssignments(prev => prev.filter(a => a.id !== `temp-${userId}`))
      setAvailableStaff(prev => [...prev, staff])

      const errorMessage = error instanceof Error ? error.message : 'Failed to assign staff member'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  const handleIndividualAssign = async (userId: string) => {
    if (!individualTemplateId) return

    const staff = availableStaff.find(s => s.id === userId)
    const template = roleTemplates.find(t => t.id === individualTemplateId)
    if (!staff || !template) return

    // Optimistic update - create temporary assignment
    const optimisticAssignment = {
      id: `temp-${userId}`,
      user_id: userId,
      role: template.role,
      project_id: project.id,
      pay_rate: individualPayRate || template.base_pay_rate || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: {
        id: userId,
        full_name: staff.full_name,
        email: staff.email,
        nearest_major_city: staff.nearest_major_city,
        willing_to_fly: staff.willing_to_fly
      }
    }

    // Add optimistic assignment and remove from available staff
    setAssignments(prev => [...prev, optimisticAssignment])
    setAvailableStaff(prev => prev.filter(s => s.id !== userId))

    // Close popover and reset form
    setIndividualAssignOpen(null)
    setIndividualTemplateId('')
    setIndividualPayRate('')

    try {
      const response = await fetch(`/api/projects/${project.id}/team-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role: template.role,
          pay_rate: individualPayRate || template.base_pay_rate || undefined
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Assigned ${staff.full_name} to ${template.display_name}`,
        })
        // Silent refresh to get real ID and sync server state
        await reloadDataSilently()
      } else {
        throw new Error('Failed to assign staff member')
      }
    } catch (error) {
      console.error('Error assigning staff:', error)

      // Revert optimistic updates on error
      setAssignments(prev => prev.filter(a => a.id !== `temp-${userId}`))
      setAvailableStaff(prev => [...prev, staff])

      toast({
        title: "Error",
        description: "Failed to assign staff member",
        variant: "destructive"
      })
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    // Find the assignment being removed
    const assignmentToRemove = assignments.find(a => a.id === assignmentId)
    if (!assignmentToRemove) return

    // Remove from bulk selection if selected
    setSelectedConfirmedAssignments(prev => {
      const newSet = new Set(prev)
      newSet.delete(assignmentId)
      return newSet
    })

    // Optimistically remove from assignments
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))

    // Optimistically add back to available staff
    const staffToRestore = {
      id: assignmentToRemove.user_id,
      full_name: assignmentToRemove.profiles.full_name,
      email: assignmentToRemove.profiles.email,
      role: assignmentToRemove.role, // Use their project role as system role temporarily
      nearest_major_city: assignmentToRemove.profiles.nearest_major_city,
      willing_to_fly: assignmentToRemove.profiles.willing_to_fly,
      status: 'active',
      created_at: new Date().toISOString()
    }
    setAvailableStaff(prev => [...prev, staffToRestore])

    try {
      const response = await fetch(`/api/projects/${project.id}/team-assignments/${assignmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Staff member removed from project",
        })
        // Silent refresh to sync any server-side changes
        await reloadDataSilently()
      } else {
        throw new Error('Failed to remove assignment')
      }
    } catch (error) {
      console.error('Error removing assignment:', error)

      // Revert optimistic updates on error
      setAssignments(prev => [...prev, assignmentToRemove])
      setAvailableStaff(prev => prev.filter(s => s.id !== assignmentToRemove.user_id))

      toast({
        title: "Error",
        description: "Failed to remove staff member",
        variant: "destructive"
      })
    }
  }

  const handleUnconfirmAssignment = async (assignmentId: string) => {
    // Find the assignment being unconfirmed
    const assignmentToUnconfirm = assignments.find(a => a.id === assignmentId)
    if (!assignmentToUnconfirm) return

    // Remove from bulk selection if selected
    setSelectedConfirmedAssignments(prev => {
      const newSet = new Set(prev)
      newSet.delete(assignmentId)
      return newSet
    })

    // Optimistically update the assignment to remove confirmation
    setAssignments(prev => prev.map(a => 
      a.id === assignmentId 
        ? { ...a, confirmed_at: null, available_dates: null }
        : a
    ))

    try {
      const response = await fetch(`/api/projects/${project.id}/team-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed_at: null,
          available_dates: null
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team member moved back to pending status",
        })
        // Silent refresh to sync any server-side changes
        await reloadDataSilently()
      } else {
        throw new Error('Failed to unconfirm assignment')
      }
    } catch (error) {
      console.error('Error unconfirming assignment:', error)

      // Revert optimistic updates on error
      setAssignments(prev => prev.map(a => 
        a.id === assignmentId 
          ? assignmentToUnconfirm
          : a
      ))

      toast({
        title: "Error",
        description: "Failed to unconfirm team member",
        variant: "destructive"
      })
    }
  }

  const handleUpdateAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/team-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assignment updated successfully",
        })
        setEditingAssignment(null)
        setEditValues({})
        setEditPopoverOpen(null)
        await reloadDataSilently()
      }
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive"
      })
    }
  }

  const handleFinalizeAssignments = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/readiness/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'team' })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team assignments finalized",
        })
        // Invalidate readiness cache to trigger refresh
        await invalidateReadiness('team_assignment_change')
        await onProjectUpdate()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to finalize team assignments')
      }
    } catch (error) {
      console.error('Error finalizing assignments:', error)
      toast({
        title: "Error",
        description: "Failed to finalize team assignments",
        variant: "destructive"
      })
    }
  }

  const handleBulkRemoveAssignments = async () => {
    if (selectedAssignments.size === 0) return

    const assignmentsToRemove = Array.from(selectedAssignments).map(id =>
      assignments.find(a => a.id === id)
    ).filter(Boolean)

    // Create staff objects to restore to available list
    const staffToRestore = assignmentsToRemove.map(assignment => ({
      id: assignment.user_id,
      full_name: assignment.profiles.full_name,
      email: assignment.profiles.email,
      role: assignment.role, // Use their project role as temporary system role
      nearest_major_city: assignment.profiles.nearest_major_city,
      willing_to_fly: assignment.profiles.willing_to_fly,
      status: 'active',
      created_at: new Date().toISOString()
    }))

    // Optimistic update - remove from assignments and add back to available staff
    setAssignments(prev => prev.filter(a => !selectedAssignments.has(a.id)))
    setAvailableStaff(prev => [...prev, ...staffToRestore])
    setSelectedAssignments(new Set())

    try {
      const promises = Array.from(selectedAssignments).map(assignmentId =>
        fetch(`/api/projects/${project.id}/team-assignments/${assignmentId}`, {
          method: 'DELETE'
        })
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `Removed ${assignmentsToRemove.length} team assignments`,
      })

      // Silent refresh to sync any server-side changes and get correct system roles
      await reloadDataSilently()
    } catch (error) {
      console.error('Error bulk removing assignments:', error)

      // Revert optimistic updates on error
      setAssignments(prev => [...prev, ...assignmentsToRemove])
      setAvailableStaff(prev => prev.filter(s => !staffToRestore.some(staff => staff.id === s.id)))

      toast({
        title: "Error",
        description: "Failed to remove assignments",
        variant: "destructive"
      })
    }
  }

  const handleBulkUpdatePayRate = async () => {
    if (selectedAssignments.size === 0 || !bulkPayRate) return

    const assignmentsToUpdate = Array.from(selectedAssignments).map(id =>
      assignments.find(a => a.id === id)
    ).filter(Boolean)

    // Optimistic update
    setAssignments(prev => prev.map(a =>
      selectedAssignments.has(a.id) ? { ...a, pay_rate: bulkPayRate } : a
    ))
    setSelectedAssignments(new Set())
    setBulkPayRate('')

    try {
      const promises = Array.from(selectedAssignments).map(assignmentId =>
        fetch(`/api/projects/${project.id}/team-assignments/${assignmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pay_rate: bulkPayRate })
        })
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `Updated pay rate for ${assignmentsToUpdate.length} assignments`,
      })

      await reloadDataSilently()
    } catch (error) {
      console.error('Error bulk updating pay rates:', error)

      // Revert optimistic update
      setAssignments(prev => prev.map(a => {
        const original = assignmentsToUpdate.find(orig => orig.id === a.id)
        return original ? { ...a, pay_rate: original.pay_rate } : a
      }))

      toast({
        title: "Error",
        description: "Failed to update pay rates",
        variant: "destructive"
      })
    }
  }

  // Bulk actions for confirmed team members
  const handleBulkMoveToPending = async () => {
    if (selectedConfirmedAssignments.size === 0) return

    setIsBulkActionInProgress(true)

    const assignmentsToUpdate = Array.from(selectedConfirmedAssignments).map(id =>
      assignments.find(a => a.id === id)
    ).filter(Boolean)

    // Optimistic update - move confirmed assignments back to pending
    setAssignments(prev => prev.map(a =>
      selectedConfirmedAssignments.has(a.id) 
        ? { ...a, confirmed_at: null, available_dates: null }
        : a
    ))
    setSelectedConfirmedAssignments(new Set())

    try {
      const promises = Array.from(selectedConfirmedAssignments).map(assignmentId =>
        fetch(`/api/projects/${project.id}/team-assignments/${assignmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ available_dates: null })
        })
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `Moved ${assignmentsToUpdate.length} team member${assignmentsToUpdate.length === 1 ? '' : 's'} to pending`,
      })

      await reloadDataSilently()
    } catch (error) {
      console.error('Error bulk moving to pending:', error)

      // Revert optimistic updates on error
      setAssignments(prev => prev.map(a => {
        const original = assignmentsToUpdate.find(orig => orig.id === a.id)
        return original ? { ...a, confirmed_at: original.confirmed_at, available_dates: original.available_dates } : a
      }))

      toast({
        title: "Error",
        description: "Failed to move team members to pending",
        variant: "destructive"
      })
    } finally {
      setIsBulkActionInProgress(false)
    }
  }

  const handleBulkRemoveConfirmed = async () => {
    if (selectedConfirmedAssignments.size === 0) return

    setIsBulkActionInProgress(true)

    const assignmentsToRemove = Array.from(selectedConfirmedAssignments).map(id =>
      assignments.find(a => a.id === id)
    ).filter(Boolean)

    // Create staff objects to restore to available list
    const staffToRestore = assignmentsToRemove.map(assignment => ({
      id: assignment.user_id,
      full_name: assignment.profiles.full_name,
      email: assignment.profiles.email,
      role: assignment.role,
      nearest_major_city: assignment.profiles.nearest_major_city,
      willing_to_fly: assignment.profiles.willing_to_fly,
      status: 'active',
      created_at: new Date().toISOString()
    }))

    // Optimistic update - remove from assignments and add back to available staff
    setAssignments(prev => prev.filter(a => !selectedConfirmedAssignments.has(a.id)))
    setAvailableStaff(prev => [...prev, ...staffToRestore])
    setSelectedConfirmedAssignments(new Set())

    try {
      const promises = Array.from(selectedConfirmedAssignments).map(assignmentId =>
        fetch(`/api/projects/${project.id}/team-assignments/${assignmentId}`, {
          method: 'DELETE'
        })
      )

      await Promise.all(promises)

      toast({
        title: "Success",
        description: `Removed ${assignmentsToRemove.length} team member${assignmentsToRemove.length === 1 ? '' : 's'} from project`,
      })

      await reloadDataSilently()
    } catch (error) {
      console.error('Error bulk removing confirmed assignments:', error)

      // Revert optimistic updates on error
      setAssignments(prev => [...prev, ...assignmentsToRemove])
      setAvailableStaff(prev => prev.filter(s => !staffToRestore.some(staff => staff.id === s.id)))

      toast({
        title: "Error",
        description: "Failed to remove team members from project",
        variant: "destructive"
      })
    } finally {
      setIsBulkActionInProgress(false)
    }
  }

  const clearAssignmentFilters = () => {
    setAssignmentFilters({
      search: '',
      role: 'all',
      city: 'all',
      flight_willingness: 'all',
      sort_by: 'name',
      sort_order: 'asc'
    })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      role: null,
      location: null,
      status: null,
      willing_to_fly: null,
      sort_by: 'full_name',
      sort_order: 'asc'
    })
  }

  const handleConfirmAvailability = (teamMember: TeamAssignment) => {
    if (!projectSchedule) {
      toast({
        title: "Error",
        description: "Project schedule not available",
        variant: "destructive"
      })
      return
    }
    
    setSelectedTeamMember(teamMember)
    setAvailabilityPopupOpen(true)
  }

  const handleAvailabilityConfirm = async (availableDates: Date[]) => {
    if (!selectedTeamMember) return

    // Convert dates to ISO strings
    const availableDateStrings = availableDates.map(date => 
      date.toISOString().split('T')[0]
    )

    // Store original assignment for potential rollback
    const originalAssignment = selectedTeamMember

    // OPTIMISTIC UI UPDATES - Happen immediately
    // 1. Close popup immediately
    setAvailabilityPopupOpen(false)
    setSelectedTeamMember(null)
    setIsConfirmingAvailability(false)

    // 2. Optimistically update the assignment to confirmed status
    setAssignments(prev => prev.map(assignment => 
      assignment.id === originalAssignment.id 
        ? {
            ...assignment,
            confirmed_at: new Date().toISOString(),
            available_dates: availableDateStrings
          }
        : assignment
    ))

    // 3. Show success toast immediately
    toast({
      title: "Success",
      description: `Availability confirmed for ${originalAssignment.profiles.full_name}`,
    })

    // BACKGROUND API CALL - Happens after UI updates
    try {
      const response = await fetch(`/api/projects/${project.id}/team-assignments/${originalAssignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available_dates: availableDateStrings
        })
      })

      if (response.ok) {
        // Silent refresh to sync any server-side changes
        await reloadDataSilently()
      } else {
        throw new Error('Failed to confirm availability')
      }
    } catch (error) {
      console.error('Error confirming availability:', error)

      // ROLLBACK OPTIMISTIC UPDATES on error
      setAssignments(prev => prev.map(assignment => 
        assignment.id === originalAssignment.id 
          ? originalAssignment // Restore original state
          : assignment
      ))

      toast({
        title: "Error",
        description: "Failed to confirm availability. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleEditAvailability = (teamMember: TeamAssignment) => {
    if (!projectSchedule) return
    
    setSelectedTeamMember(teamMember)
    setAvailabilityPopupOpen(true)
  }

  const handleMassConfirm = async (confirmations: { assignmentId: string; availableDates: Date[] }[]) => {
    if (confirmations.length === 0) return

    setIsMassConfirming(true)

    // Store original assignments for potential rollback
    const originalAssignments = assignments.filter(a => 
      confirmations.some(c => c.assignmentId === a.id)
    )

    // OPTIMISTIC UI UPDATES - Happen immediately
    // 1. Close popup immediately
    setMassConfirmPopupOpen(false)

    // 2. Clear selected assignments since they're being confirmed
    setSelectedAssignments(new Set())

    // 3. Optimistically update all assignments to confirmed status
    setAssignments(prev => prev.map(assignment => {
      const confirmation = confirmations.find(c => c.assignmentId === assignment.id)
      if (confirmation) {
        const availableDateStrings = confirmation.availableDates.map(date => 
          date.toISOString().split('T')[0]
        )
        return {
          ...assignment,
          confirmed_at: new Date().toISOString(),
          available_dates: availableDateStrings
        }
      }
      return assignment
    }))

    // 4. Show success toast immediately
    toast({
      title: "Success",
      description: `Confirmed availability for ${confirmations.length} team member${confirmations.length === 1 ? '' : 's'}`,
    })

    // BACKGROUND API CALLS - Happen after UI updates
    try {
      // Process all confirmations in parallel
      const updatePromises = confirmations.map(async (confirmation) => {
        const availableDateStrings = confirmation.availableDates.map(date => 
          date.toISOString().split('T')[0]
        )
        
        const response = await fetch(`/api/projects/${project.id}/team-assignments/${confirmation.assignmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            available_dates: availableDateStrings
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to confirm ${confirmation.assignmentId}`)
        }
      })

      await Promise.all(updatePromises)
      
      // Silent refresh to sync any server-side changes
      await reloadDataSilently()
    } catch (error) {
      console.error('Error in mass confirmation:', error)

      // ROLLBACK OPTIMISTIC UPDATES on error
      setAssignments(prev => prev.map(assignment => {
        const originalAssignment = originalAssignments.find(orig => orig.id === assignment.id)
        return originalAssignment || assignment
      }))

      toast({
        title: "Error",
        description: "Failed to confirm some team members. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsMassConfirming(false)
    }
  }

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === 'asc' ? 'desc' : 'asc'
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Role Template Manager - Collapsible */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle
              className="flex items-center gap-2 cursor-pointer flex-1"
              onClick={() => setIsRoleTemplatesExpanded(!isRoleTemplatesExpanded)}
            >
              {isRoleTemplatesExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <FileText className="h-5 w-5" />
              Role Templates
            </CardTitle>
            <div className="flex items-center gap-2">
              {isRoleTemplatesExpanded && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    roleTemplateManagerRef.current?.openAddDialog()
                  }}
                  size="sm"
                  className="mr-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role Template
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {isRoleTemplatesExpanded && (
          <CardContent>
            <ProjectRoleTemplateManager
              ref={roleTemplateManagerRef}
              projectId={project.id}
              onUpdate={loadData}
            />
          </CardContent>
        )}
      </Card>



      {/* Staff Assignment Interface */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setIsAssignStaffExpanded(!isAssignStaffExpanded)}>
          <CardTitle className="flex items-center gap-2">
            {isAssignStaffExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <UserPlus className="h-5 w-5" />
            Assign Staff to Roles
          </CardTitle>
        </CardHeader>
        {isAssignStaffExpanded && (
          <CardContent className="space-y-4">
            {/* Filters Row */}
            <div className="space-y-3">
              {/* Search and Controls Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff by name or email..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSortChange(filters.sort_by)}
                    className="flex items-center gap-2"
                  >
                    {filters.sort_order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {filters.sort_order === 'asc' ? 'Ascending' : 'Descending'}
                  </Button>
                </div>
              </div>

              {/* Filter Dropdowns Row */}
              <div className="flex flex-wrap gap-3">
                <Select value={filters.role || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value === 'all' ? null : value }))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">{getRoleDisplayName('admin')}</SelectItem>
                    <SelectItem value="in_house">{getRoleDisplayName('in_house')}</SelectItem>
                    <SelectItem value="supervisor">{getRoleDisplayName('supervisor')}</SelectItem>
                    <SelectItem value="coordinator">{getRoleDisplayName('coordinator')}</SelectItem>
                    <SelectItem value="talent_escort">{getRoleDisplayName('talent_escort')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.location || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value === 'all' ? null : value }))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {uniqueLocations.map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.sort_by} onValueChange={(value) => setFilters(prev => ({ ...prev, sort_by: value }))}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_name">Sort by Name</SelectItem>
                    <SelectItem value="email">Sort by Email</SelectItem>
                    <SelectItem value="nearest_major_city">Sort by City</SelectItem>
                    <SelectItem value="role">Sort by Role</SelectItem>
                    <SelectItem value="created_at">Sort by Date Added</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={filters.willing_to_fly === true ? "default" : "outline"}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      willing_to_fly: prev.willing_to_fly === true ? null : true
                    }))
                  }}
                  className="h-9 flex items-center gap-2"
                >
                  <Plane className="h-3 w-3" />
                  Will fly
                </Button>
              </div>
            </div>

            {/* Staff Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 min-h-[40px]">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedStaff.size === filteredStaff.length && filteredStaff.length > 0) {
                        setSelectedStaff(new Set())
                      } else {
                        setSelectedStaff(new Set(filteredStaff.map(s => s.id)))
                      }
                    }}
                  >
                    {selectedStaff.size === filteredStaff.length && filteredStaff.length > 0 ? 'Deselect All' : 'Select All'} ({filteredStaff.length})
                  </Button>
                  {selectedStaff.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStaff(new Set())}
                      >
                        Clear Selected
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {selectedStaff.size} selected
                      </span>
                    </>
                  )}
                </div>

                {/* Bulk Assignment Controls - Always visible */}
                <div className="flex items-center gap-2">
                  <Select value={bulkRole || 'none'} onValueChange={(value) => setBulkRole(value === 'none' ? '' : value as ProjectRole)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select role template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select role template...</SelectItem>
                      {roleTemplates.map(template => (
                        <SelectItem key={template.id} value={template.role}>
                          {template.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleBulkAssign} disabled={!bulkRole || isAssigning || selectedStaff.size === 0} size="sm">
                    {isAssigning ? 'Assigning...' : 'Assign Selected'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[440px] overflow-y-auto custom-scrollbar">
                {filteredStaff.map((staff) => {
                  const isSelected = selectedStaff.has(staff.id)
                  return (
                    <Card
                      key={staff.id}
                      className={`relative transition-all cursor-pointer border-2 py-0 ${isSelected
                        ? 'bg-card border-primary shadow-md'
                        : 'hover:shadow-md border-border hover:border-muted-foreground/20'
                        }`}
                      onClick={() => {
                        const newSelected = new Set(selectedStaff)
                        if (isSelected) {
                          newSelected.delete(staff.id)
                        } else {
                          newSelected.add(staff.id)
                        }
                        setSelectedStaff(newSelected)
                      }}
                    >
                      <CardContent className="px-4 py-3">
                        <div className="space-y-2.5">
                          <div>
                            <h4 className={`font-medium text-base leading-tight ${isSelected ? 'text-foreground' : ''
                              }`}>
                              {staff.full_name}
                            </h4>
                            <p className="text-sm truncate text-muted-foreground">
                              {staff.email}
                            </p>
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="space-y-1.5 flex-1">
                              {staff.role && (
                                <Badge variant="outline" className={`text-sm ${getRoleColor(staff.role)}`}>
                                  {getRoleDisplayName(staff.role)}
                                </Badge>
                              )}

                              {staff.nearest_major_city && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{staff.nearest_major_city}</span>
                                </div>
                              )}

                              {staff.willing_to_fly !== undefined && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Plane className="h-3.5 w-3.5" />
                                  <span>{staff.willing_to_fly ? 'Will fly' : 'Local only'}</span>
                                </div>
                              )}
                            </div>

                            {/* Project Badge - Center */}
                            <div className="flex-1 flex justify-center">
                              {(() => {
                                const userAssignments = getUserProjectAssignments(staff.id)
                                if (userAssignments.length > 0) {
                                  const tooltipContent = userAssignments.map(a => (
                                    <div key={a.id} className="text-sm leading-relaxed">
                                      <span className="font-semibold text-foreground">{a.projects?.name || 'Unknown Project'}</span>
                                      <span className="text-muted-foreground ml-2">({getRoleDisplayName(a.role)})</span>
                                    </div>
                                  ))

                                  return (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="outline"
                                            className="text-xs cursor-pointer hover:bg-muted transition-colors hidden md:block"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {userAssignments.length} Project{userAssignments.length !== 1 ? 's' : ''}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="bottom"
                                          className="max-w-xs p-3 bg-popover border border-border shadow-lg rounded-md"
                                        >
                                          <div className="space-y-2">
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                              Project Assignment{userAssignments.length !== 1 ? 's' : ''}
                                            </div>
                                            <div className="space-y-1">
                                              {tooltipContent}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Badge
                                        variant="outline"
                                        className="text-xs cursor-pointer hover:bg-muted transition-colors md:hidden"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          // Could add modal functionality here for mobile
                                        }}
                                      >
                                        {userAssignments.length} Project{userAssignments.length !== 1 ? 's' : ''}
                                      </Badge>
                                    </TooltipProvider>
                                  )
                                }
                                return null
                              })()}
                            </div>

                            <div className="flex-1 flex justify-end">
                              <div className="flex">
                                {/* Main Assign Button */}
                                <Button
                                  size="sm"
                                  className="h-7 text-xs px-3 rounded-r-none border-r-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleQuickAssign(staff.id)
                                  }}
                                >
                                  Assign
                                </Button>

                                {/* Dropdown Button */}
                                <Popover
                                  open={individualAssignOpen === staff.id}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setIndividualAssignOpen(staff.id)
                                      setIndividualTemplateId('')
                                      setIndividualPayRate('')
                                    } else {
                                      setIndividualAssignOpen(null)
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 rounded-l-none border-l border-primary/20"
                                      variant="default"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-3" align="start">
                                    <div className="space-y-3">
                                      <div className="text-sm font-medium">Assign {staff.full_name}</div>

                                      <div className="space-y-2">
                                        <Label className="text-xs">Select Role Template</Label>
                                        <Select value={individualTemplateId || 'none'} onValueChange={(value) => {
                                          if (value === 'none') {
                                            setIndividualTemplateId('')
                                            setIndividualPayRate('')
                                          } else {
                                            const template = roleTemplates.find(t => t.id === value)
                                            setIndividualTemplateId(value)
                                            setIndividualPayRate(template?.base_pay_rate || '')
                                          }
                                        }}>
                                          <SelectTrigger className="h-8 w-full">
                                            <SelectValue placeholder="Select role template..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">Select role template...</SelectItem>
                                            {roleTemplates.map(template => (
                                              <SelectItem key={template.id} value={template.id}>
                                                {template.display_name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="text-xs">Pay Rate Override (optional)</Label>
                                        <Input
                                          type="number"
                                          placeholder="Enter rate..."
                                          value={individualPayRate}
                                          onChange={(e) => setIndividualPayRate(e.target.value ? Number(e.target.value) : '')}
                                          className="h-8"
                                        />
                                      </div>

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleIndividualAssign(staff.id)}
                                          disabled={!individualTemplateId}
                                          className="flex-1"
                                        >
                                          Assign
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setIndividualAssignOpen(null)}
                                          className="flex-1"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {filteredStaff.length === 0 && (
                <TeamEmptyState
                  variant="filtered"
                  onNavigate={(route) => {
                    console.log('Navigate to:', route)
                  }}
                />
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Pending Team Assignments */}
      {assignments.filter(a => !a.confirmed_at).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle 
                className="flex items-center gap-2 cursor-pointer" 
                onClick={() => setIsCurrentAssignmentsExpanded(!isCurrentAssignmentsExpanded)}
              >
                {isCurrentAssignmentsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Users className="h-5 w-5" />
                Pending Team Assignments
              </CardTitle>

            </div>
          </CardHeader>
          {isCurrentAssignmentsExpanded && (
            <CardContent className="space-y-4">
              {/* Filters Row */}
              <div className="space-y-3">
                {/* Search and Controls Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search assignments by name or email..."
                        value={assignmentFilters.search}
                        onChange={(e) => setAssignmentFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={clearAssignmentFilters}>
                      Clear Filters
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignmentFilters(prev => ({
                        ...prev,
                        sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc'
                      }))}
                      className="flex items-center gap-2"
                    >
                      {assignmentFilters.sort_order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {assignmentFilters.sort_order === 'asc' ? 'Ascending' : 'Descending'}
                    </Button>
                  </div>
                </div>

                {/* Filter Dropdowns Row */}
                <div className="flex flex-wrap gap-3">
                  <Select value={assignmentFilters.role} onValueChange={(value) => setAssignmentFilters(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      {assignmentFilterOptions.roles.map(role => (
                        <SelectItem key={role} value={role}>
                          {getRoleDisplayName(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={assignmentFilters.city} onValueChange={(value) => setAssignmentFilters(prev => ({ ...prev, city: value }))}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cities</SelectItem>
                      {assignmentFilterOptions.cities.map(city => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={assignmentFilters.sort_by} onValueChange={(value) => setAssignmentFilters(prev => ({ ...prev, sort_by: value }))}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Sort by Name</SelectItem>
                      <SelectItem value="role">Sort by Role</SelectItem>
                      <SelectItem value="pay_rate">Sort by Pay Rate</SelectItem>
                      <SelectItem value="city">Sort by City</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant={assignmentFilters.flight_willingness === 'yes' ? "default" : "outline"}
                    onClick={() => {
                      setAssignmentFilters(prev => ({
                        ...prev,
                        flight_willingness: prev.flight_willingness === 'yes' ? 'all' : 'yes'
                      }))
                    }}
                    className="h-9 flex items-center gap-2"
                  >
                    <Plane className="h-3 w-3" />
                    Will fly
                  </Button>
                </div>
              </div>

              {/* Assignment Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 min-h-[40px]">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedAssignments.size === filteredPendingAssignments.length && filteredPendingAssignments.length > 0) {
                          setSelectedAssignments(new Set())
                        } else {
                          setSelectedAssignments(new Set(filteredPendingAssignments.map(a => a.id)))
                        }
                      }}
                    >
                      {selectedAssignments.size === filteredPendingAssignments.length && filteredPendingAssignments.length > 0 ? 'Deselect All' : 'Select All'} ({filteredPendingAssignments.length})
                    </Button>
                    {selectedAssignments.size > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAssignments(new Set())}
                        >
                          Clear Selected
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {selectedAssignments.size} selected
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bulk Actions */}
                  {selectedAssignments.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="New pay rate"
                        value={bulkPayRate}
                        onChange={(e) => setBulkPayRate(e.target.value ? Number(e.target.value) : '')}
                        className="w-32"
                      />
                      <Button
                        onClick={handleBulkUpdatePayRate}
                        disabled={!bulkPayRate}
                        size="sm"
                      >
                        Update Rate
                      </Button>
                      <Button
                        onClick={() => {
                          // Filter selected assignments to only include the ones that are selected
                          const selectedPendingAssignments = filteredPendingAssignments.filter(a => selectedAssignments.has(a.id))
                          setMassConfirmPopupOpen(true)
                        }}
                        size="sm"
                      >
                        Confirm Selected
                      </Button>
                      <Button
                        onClick={handleBulkRemoveAssignments}
                        variant="destructive"
                        size="sm"
                      >
                        Remove Selected
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[440px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                {filteredPendingAssignments.map((assignment) => {
                  const isSelected = selectedAssignments.has(assignment.id)
                  return (
                    <Card
                      key={assignment.id}
                      className={`relative transition-all cursor-pointer border-2 py-0 ${isSelected
                        ? 'bg-card border-primary shadow-md'
                        : 'hover:shadow-md border-border hover:border-muted-foreground/20'
                        }`}
                      onClick={() => {
                        const newSelected = new Set(selectedAssignments)
                        if (isSelected) {
                          newSelected.delete(assignment.id)
                        } else {
                          newSelected.add(assignment.id)
                        }
                        setSelectedAssignments(newSelected)
                      }}
                    >
                      <CardContent className="px-4 py-3">
                        <div className="space-y-2.5">
                          <div>
                            <h4 className={`font-medium text-base leading-tight ${isSelected ? 'text-foreground' : ''
                              }`}>
                              {assignment.profiles.full_name}
                            </h4>
                            <p className="text-sm truncate text-muted-foreground">
                              {assignment.profiles.email}
                            </p>
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-sm ${getRoleColor(assignment.role)}`}>
                                  {roleTemplates.find(t => t.role === assignment.role && t.is_default)?.display_name || getRoleDisplayName(assignment.role)}
                                </Badge>
                                {assignment.pay_rate && (
                                  <Badge variant="outline" className="text-sm">
                                    ${assignment.pay_rate}
                                  </Badge>
                                )}
                              </div>

                              {assignment.profiles.nearest_major_city && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{assignment.profiles.nearest_major_city}</span>
                                </div>
                              )}

                              {assignment.profiles.willing_to_fly !== undefined && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Plane className="h-3.5 w-3.5" />
                                  <span>{assignment.profiles.willing_to_fly ? 'Will fly' : 'Local only'}</span>
                                </div>
                              )}

                              {assignment.schedule_notes && (
                                <div className="text-xs text-muted-foreground bg-muted/50 p-1 rounded">
                                  {assignment.schedule_notes}
                                </div>
                              )}
                            </div>

                            <div className="ml-2 flex gap-1">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleConfirmAvailability(assignment)
                                }}
                                className="h-7 px-3 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Confirm
                              </Button>
                              <TrashButton
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveAssignment(assignment.id)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {filteredPendingAssignments.length === 0 && assignments.filter(a => !a.confirmed_at).length > 0 && (
                <TeamEmptyState
                  variant="filtered"
                  onNavigate={(route) => {
                    console.log('Navigate to:', route)
                  }}
                />
              )}

              {assignments.filter(a => !a.confirmed_at).length === 0 && (
                <TeamEmptyState
                  variant="empty"
                  onNavigate={(route) => {
                    console.log('Navigate to:', route)
                  }}
                  featureAvailability={timeTrackingAvailability}
                />
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Confirmed Team Members */}
      {assignments.filter(a => a.confirmed_at).length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setIsConfirmedAssignmentsExpanded(!isConfirmedAssignmentsExpanded)}>
            <CardTitle className="flex items-center gap-2">
              {isConfirmedAssignmentsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Users className="h-5 w-5" />
              Confirmed Team Members
            </CardTitle>
          </CardHeader>
          {isConfirmedAssignmentsExpanded && (
            <CardContent className="space-y-4">
              {/* Bulk Selection Controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedConfirmedAssignments.size === filteredConfirmedAssignments.length && filteredConfirmedAssignments.length > 0) {
                        setSelectedConfirmedAssignments(new Set())
                      } else {
                        setSelectedConfirmedAssignments(new Set(filteredConfirmedAssignments.map(a => a.id)))
                      }
                    }}
                  >
                    {selectedConfirmedAssignments.size === filteredConfirmedAssignments.length && filteredConfirmedAssignments.length > 0 ? 'Deselect All' : 'Select All'} ({filteredConfirmedAssignments.length})
                  </Button>
                  {selectedConfirmedAssignments.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedConfirmedAssignments(new Set())}
                      >
                        Clear Selected
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {selectedConfirmedAssignments.size} selected
                      </span>
                    </>
                  )}
                </div>

                {/* Bulk Actions */}
                {selectedConfirmedAssignments.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleBulkMoveToPending}
                      variant="outline"
                      size="sm"
                      disabled={isBulkActionInProgress}
                    >
                      {isBulkActionInProgress ? 'Moving...' : 'Move to Pending'}
                    </Button>
                    <Button
                      onClick={handleBulkRemoveConfirmed}
                      variant="destructive"
                      size="sm"
                      disabled={isBulkActionInProgress}
                    >
                      {isBulkActionInProgress ? 'Removing...' : 'Remove from Project'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[440px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                {filteredConfirmedAssignments.map((assignment) => {
                  const availableDates = assignment.available_dates ? 
                    assignment.available_dates.map(dateStr => {
                      // Parse date string as local date to avoid timezone issues
                      const [year, month, day] = dateStr.split('-').map(Number)
                      return new Date(year, month - 1, day) // month is 0-indexed
                    }) : []
                  
                  const isSelected = selectedConfirmedAssignments.has(assignment.id)
                  
                  return (
                    <Card
                      key={assignment.id}
                      className={`relative transition-all cursor-pointer border-2 py-0 ${isSelected
                        ? 'bg-card border-primary shadow-md'
                        : 'hover:shadow-md border-border hover:border-muted-foreground/20'
                        }`}
                      onClick={() => {
                        const newSelected = new Set(selectedConfirmedAssignments)
                        if (isSelected) {
                          newSelected.delete(assignment.id)
                        } else {
                          newSelected.add(assignment.id)
                        }
                        setSelectedConfirmedAssignments(newSelected)
                      }}
                    >
                      <CardContent className="px-4 py-3">
                        <div className="space-y-2.5">
                          <div>
                            <h4 className={`font-medium text-base leading-tight ${isSelected ? 'text-foreground' : ''}`}>
                              {assignment.profiles.full_name}
                            </h4>
                            <p className="text-sm truncate text-muted-foreground">
                              {assignment.profiles.email}
                            </p>
                          </div>

                          {/* Role and Pay Rate - Full Width */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-sm ${getRoleColor(assignment.role)}`}>
                              {roleTemplates.find(t => t.role === assignment.role && t.is_default)?.display_name || getRoleDisplayName(assignment.role)}
                            </Badge>
                            {assignment.pay_rate && (
                              <Badge variant="outline" className="text-sm">
                                ${assignment.pay_rate}
                              </Badge>
                            )}
                          </div>

                          {/* Availability Display - Full Width */}
                          {projectSchedule && availableDates.length > 0 && (
                            <div className="flex items-start gap-2 flex-wrap">
                              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground shrink-0">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Availability:
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {availableDates
                                  .sort((a, b) => a.getTime() - b.getTime())
                                  .map((date) => {
                                    const month = date.getMonth() + 1
                                    const day = date.getDate()
                                    return (
                                      <Badge 
                                        key={date.getTime()} 
                                        variant="outline" 
                                        className="text-xs px-1.5 py-0.5"
                                      >
                                        {month}/{day}
                                      </Badge>
                                    )
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Schedule Notes - Full Width */}
                          {assignment.schedule_notes && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-1 rounded">
                              {assignment.schedule_notes}
                            </div>
                          )}

                          {/* Location and Buttons Row - Only this row has columns */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {assignment.profiles.nearest_major_city && (
                                <>
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{assignment.profiles.nearest_major_city}</span>
                                </>
                              )}
                            </div>

                            <div className="flex gap-1 shrink-0">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditAvailability(assignment)
                                      }}
                                      className="h-7 w-7 p-0"
                                    >
                                      <CalendarDays className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit availability schedule</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Popover 
                                open={deleteMenuOpen === assignment.id} 
                                onOpenChange={(open) => setDeleteMenuOpen(open ? assignment.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <TrashButton
                                    variant="outline"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end">
                                  <div className="space-y-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start hover:bg-muted"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleUnconfirmAssignment(assignment.id)
                                        setDeleteMenuOpen(null)
                                      }}
                                    >
                                      Move to Pending
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveAssignment(assignment.id)
                                        setDeleteMenuOpen(null)
                                      }}
                                    >
                                      Remove from Project
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {filteredConfirmedAssignments.length === 0 && assignments.filter(a => a.confirmed_at).length > 0 && (
                <TeamEmptyState
                  variant="filtered"
                  onNavigate={(route) => {
                    console.log('Navigate to:', route)
                  }}
                />
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Assignment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Assignment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{assignmentSummary.supervisorCount}</div>
              <div className="text-sm text-muted-foreground">
                {assignmentSummary.supervisorCount === 1 ? 'Supervisor' : 'Supervisors'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{assignmentSummary.tlcCount}</div>
              <div className="text-sm text-muted-foreground">
                {assignmentSummary.tlcCount === 1 ? 'TLC' : 'TLCs'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{assignmentSummary.escortCount}</div>
              <div className="text-sm text-muted-foreground">
                {assignmentSummary.escortCount === 1 ? 'Escort' : 'Escorts'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${assignmentSummary.estimatedDailyCost.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Est. Daily Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finalize Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleFinalizeAssignments}
          disabled={assignments.length === 0 || canAccessFeature('team_management')}
          className="px-8"
        >
          <Check className="h-4 w-4 mr-2" />
          {canAccessFeature('team_management') ? 'Team Assignments Finalized' : 'Finalize Team Assignments'}
        </Button>
      </div>

      {/* Availability Popup */}
      {selectedTeamMember && projectSchedule && (
        <AvailabilityPopup
          isOpen={availabilityPopupOpen}
          onClose={() => {
            setAvailabilityPopupOpen(false)
            setSelectedTeamMember(null)
          }}
          onConfirm={handleAvailabilityConfirm}
          teamMember={selectedTeamMember}
          projectSchedule={projectSchedule}
          initialAvailability={
            selectedTeamMember.available_dates 
              ? selectedTeamMember.available_dates.map(dateStr => new Date(dateStr))
              : []
          }
          isLoading={isConfirmingAvailability}
        />
      )}

      {/* Mass Availability Confirmation Popup */}
      <MassAvailabilityPopup
        open={massConfirmPopupOpen}
        onOpenChange={setMassConfirmPopupOpen}
        pendingAssignments={filteredPendingAssignments.filter(a => selectedAssignments.has(a.id))}
        projectSchedule={projectSchedule}
        onConfirm={handleMassConfirm}
        isConfirming={isMassConfirming}
      />
    </div>
  )
}