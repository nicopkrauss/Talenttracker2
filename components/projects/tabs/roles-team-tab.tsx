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
import { Search, Users, DollarSign, Plus, X, Check, ArrowUp, ArrowDown, MapPin, Plane, ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProjectRoleTemplateManager } from '@/components/projects/project-role-template-manager'

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



export function RolesTeamTab({ project, onProjectUpdate }: RolesTeamTabProps) {
  const { toast } = useToast()
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

  // Filtered and sorted assignments
  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(assignment => {
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

  // Load team assignments and available staff
  useEffect(() => {
    loadData()
  }, [project.id])

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
      const response = await fetch(`/api/projects/${project.id}/team-assignments/complete`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team assignments finalized",
        })
        await onProjectUpdate()
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
          <CardTitle 
            className="flex items-center gap-2 cursor-pointer hover:text-muted-foreground transition-colors"
            onClick={() => setIsRoleTemplatesExpanded(!isRoleTemplatesExpanded)}
          >
            {isRoleTemplatesExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Role Templates
          </CardTitle>
        </CardHeader>
        {isRoleTemplatesExpanded && (
          <CardContent>
            <ProjectRoleTemplateManager 
              projectId={project.id} 
              onUpdate={loadData}
            />
          </CardContent>
        )}
      </Card>



      {/* Staff Assignment Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Assign Staff to Roles
          </CardTitle>
        </CardHeader>
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
                    className={`relative transition-all cursor-pointer border-2 py-0 ${
                      isSelected 
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
                          <h4 className={`font-medium text-base leading-tight ${
                            isSelected ? 'text-foreground' : ''
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
                          
                          <div className="ml-2 flex">
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {filteredStaff.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No staff members match your current filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Team Assignments
            </CardTitle>
          </CardHeader>
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
                      if (selectedAssignments.size === filteredAssignments.length && filteredAssignments.length > 0) {
                        setSelectedAssignments(new Set())
                      } else {
                        setSelectedAssignments(new Set(filteredAssignments.map(a => a.id)))
                      }
                    }}
                  >
                    {selectedAssignments.size === filteredAssignments.length && filteredAssignments.length > 0 ? 'Deselect All' : 'Select All'} ({filteredAssignments.length})
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
                      placeholder="New pay rate..."
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
              {filteredAssignments.map((assignment) => {
                const isSelected = selectedAssignments.has(assignment.id)
                return (
                <Card 
                  key={assignment.id} 
                  className={`relative transition-all cursor-pointer border-2 py-0 ${
                    isSelected 
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
                        <h4 className={`font-medium text-base leading-tight ${
                          isSelected ? 'text-foreground' : ''
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
                            <Popover 
                              open={editPopoverOpen === assignment.id} 
                              onOpenChange={(open) => {
                                if (open) {
                                  setEditPopoverOpen(assignment.id)
                                  setEditingAssignment(assignment.id)
                                  setEditValues({
                                    pay_rate: assignment.pay_rate || undefined,
                                    schedule_notes: assignment.schedule_notes || undefined
                                  })
                                } else {
                                  setEditPopoverOpen(null)
                                  setEditingAssignment(null)
                                  setEditValues({})
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3" align="start">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">Edit {assignment.profiles.full_name}</div>
                                  
                                  <div className="space-y-2">
                                    <Label className="text-xs">Pay Rate Override</Label>
                                    <Input
                                      type="number"
                                      placeholder="Enter pay rate..."
                                      value={editValues.pay_rate || ''}
                                      onChange={(e) => setEditValues(prev => ({ 
                                        ...prev, 
                                        pay_rate: e.target.value ? Number(e.target.value) : undefined 
                                      }))}
                                      className="h-8"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label className="text-xs">Schedule Notes</Label>
                                    <Input
                                      placeholder="Enter schedule notes..."
                                      value={editValues.schedule_notes || ''}
                                      onChange={(e) => setEditValues(prev => ({ 
                                        ...prev, 
                                        schedule_notes: e.target.value 
                                      }))}
                                      className="h-8"
                                    />
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        handleUpdateAssignment(assignment.id)
                                        setEditPopoverOpen(null)
                                      }}
                                      className="flex-1"
                                    >
                                      Save
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setEditPopoverOpen(null)}
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveAssignment(assignment.id)
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
            
            {filteredAssignments.length === 0 && assignments.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No assignments match your current filters</p>
              </div>
            )}
            
            {assignments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No team assignments yet</p>
              </div>
            )}
          </CardContent>
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
              <div className="text-sm text-muted-foreground">Supervisors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{assignmentSummary.tlcCount}</div>
              <div className="text-sm text-muted-foreground">TLCs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{assignmentSummary.escortCount}</div>
              <div className="text-sm text-muted-foreground">Escorts</div>
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
          disabled={assignments.length === 0}
          className="px-8"
        >
          <Check className="h-4 w-4 mr-2" />
          Finalize Team Assignments
        </Button>
      </div>
    </div>
  )
}