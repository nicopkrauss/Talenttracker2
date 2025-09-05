"use client"

import { useState, useEffect, useMemo } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users, Clock, Shield, Search, ArrowUp, ArrowDown, MapPin, Plane, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { PendingUsersTable } from "@/components/auth/pending-users-table"
import { getRoleDisplayName } from "@/lib/role-utils"
import { useToast } from "@/hooks/use-toast"
import type { UserProfile, PendingUser, ProjectRoleTemplate } from "@/lib/types"

interface Project {
  id: string
  name: string
  status: string
}

interface TeamAssignment {
  id: string
  user_id: string
  project_id: string
  role: string
  projects: {
    id: string
    name: string
    status: string
  }
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

export default function TeamPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [roleTemplates, setRoleTemplates] = useState<ProjectRoleTemplate[]>([])
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [assignPopoverOpen, setAssignPopoverOpen] = useState<string | null>(null)
  const [assignmentForm, setAssignmentForm] = useState({
    projectId: '',
    roleTemplateId: '',
    payRate: '' as string | number
  })
  const [bulkAssignmentForm, setBulkAssignmentForm] = useState({
    projectId: '',
    roleTemplateId: '',
    payRate: '' as string | number
  })
  const [bulkAssignPopoverOpen, setBulkAssignPopoverOpen] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [selectedUserForModal, setSelectedUserForModal] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    role: null as string | null,
    location: null as string | null,
    status: null as string | null,
    willing_to_fly: null as boolean | null,
    sort_by: 'full_name',
    sort_order: 'asc' as 'asc' | 'desc'
  })
  const { userProfile, canAccessAdminFeatures, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Get unique values for filter options
  const uniqueLocations = useMemo(() => {
    const locations = approvedUsers
      .map(user => user.nearest_major_city)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
    return locations.sort()
  }, [approvedUsers])

  // Filtered and sorted users based on current filters
  const filteredUsers = useMemo(() => {
    let filtered = approvedUsers.filter(user => {
      if (filters.search && !user.full_name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !user.email.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.role && user.role !== filters.role) {
        return false
      }
      if (filters.location && user.nearest_major_city !== filters.location) {
        return false
      }
      if (filters.status && user.status !== filters.status) {
        return false
      }
      if (filters.willing_to_fly !== null && user.willing_to_fly !== filters.willing_to_fly) {
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
  }, [approvedUsers, filters])

  // Get role templates for selected project
  const projectRoleTemplates = useMemo(() => {
    return roleTemplates.filter(template => template.project_id === assignmentForm.projectId)
  }, [roleTemplates, assignmentForm.projectId])

  // Get role templates for bulk assignment project
  const bulkProjectRoleTemplates = useMemo(() => {
    return roleTemplates.filter(template => template.project_id === bulkAssignmentForm.projectId)
  }, [roleTemplates, bulkAssignmentForm.projectId])

  // Get project assignments for a user
  const getUserProjectAssignments = (userId: string) => {
    return teamAssignments.filter(assignment => assignment.user_id === userId)
  }

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    // Check access permissions
    if (userProfile && !canAccessAdminFeatures) {
      router.push('/talent')
      return
    }

    // If we have admin access or no user profile yet (middleware handles auth), fetch data
    if (canAccessAdminFeatures || !userProfile) {
      fetchTeamData()
      fetchProjects()
      fetchTeamAssignments()
    }
  }, [userProfile, canAccessAdminFeatures, authLoading, router])

  // Fetch role templates when project is selected
  useEffect(() => {
    if (assignmentForm.projectId) {
      fetchRoleTemplates(assignmentForm.projectId)
    }
  }, [assignmentForm.projectId])

  // Fetch role templates when bulk assignment project is selected
  useEffect(() => {
    console.log('Bulk assignment project changed:', bulkAssignmentForm.projectId)
    if (bulkAssignmentForm.projectId) {
      fetchRoleTemplates(bulkAssignmentForm.projectId)
    }
  }, [bulkAssignmentForm.projectId])

  const fetchTeamData = async () => {
    try {
      // Fetch pending users with registration fields
      const { data: pendingData, error: pendingError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, nearest_major_city, willing_to_fly, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (pendingError) {
        console.error("Error fetching pending users:", pendingError)
        throw new Error(`Failed to fetch pending users: ${pendingError.message}`)
      }

      // Fetch approved users (status should be 'active' not 'approved')
      const { data: approvedData, error: approvedError } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "active")
        .order("full_name")

      if (approvedError) {
        console.error("Error fetching approved users:", approvedError)
        throw new Error(`Failed to fetch approved users: ${approvedError.message}`)
      }

      setPendingUsers(pendingData || [])
      setApprovedUsers(approvedData || [])
    } catch (error) {
      console.error("Error fetching team data:", error)
      // Don't throw here, just log the error and show empty state
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status")
        .in("status", ["prep", "active"])
        .order("name")

      if (error) {
        console.error("Error fetching projects:", error)
        return
      }

      setProjects(data || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const fetchTeamAssignments = async () => {
    try {
      // First get all team assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("team_assignments")
        .select("id, user_id, project_id, role")

      if (assignmentsError) {
        console.error("Error fetching team assignments:", assignmentsError)
        return
      }

      if (!assignments || assignments.length === 0) {
        setTeamAssignments([])
        return
      }

      // Get unique project IDs
      const projectIds = [...new Set(assignments.map(a => a.project_id))]

      // Fetch project details for those IDs, filtering for prep/active only
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, status")
        .in("id", projectIds)
        .in("status", ["prep", "active"])

      if (projectsError) {
        console.error("Error fetching projects:", projectsError)
        return
      }

      // Combine the data
      const assignmentsWithProjects = assignments
        .map(assignment => {
          const project = projectsData?.find(p => p.id === assignment.project_id)
          return project ? {
            ...assignment,
            projects: project
          } : null
        })
        .filter(Boolean) // Remove null entries (assignments to non-prep/active projects)

      setTeamAssignments(assignmentsWithProjects)
    } catch (error) {
      console.error("Error fetching team assignments:", error)
    }
  }

  const fetchRoleTemplates = async (projectId: string) => {
    try {
      console.log('Fetching role templates for project:', projectId)
      const { data, error } = await supabase
        .from("project_role_templates")
        .select("*")
        .eq("project_id", projectId)
        .order("display_name")

      if (error) {
        console.error("Error fetching role templates:", error)
        return
      }

      console.log('Role templates fetched:', data)
      setRoleTemplates(data || [])
    } catch (error) {
      console.error("Error fetching role templates:", error)
    }
  }

  const handleQuickAssign = async (userId: string) => {
    const user = approvedUsers.find(u => u.id === userId)
    if (!user) return

    // Find a default project and role template for quick assignment
    const defaultProject = projects.find(p => p.status === 'prep') || projects[0]
    if (!defaultProject) {
      toast({
        title: "No Projects Available",
        description: "No projects are available for assignment. Please create a project first.",
        variant: "destructive"
      })
      return
    }

    // Open the assignment popover for detailed assignment
    setAssignPopoverOpen(userId)
    setAssignmentForm({
      projectId: defaultProject.id,
      roleTemplateId: '',
      payRate: ''
    })
  }

  const handleAssignToProject = async (userId: string) => {
    if (!assignmentForm.projectId || !assignmentForm.roleTemplateId) {
      toast({
        title: "Missing Information",
        description: "Please select both a project and role template.",
        variant: "destructive"
      })
      return
    }

    const user = approvedUsers.find(u => u.id === userId)
    const project = projects.find(p => p.id === assignmentForm.projectId)
    const roleTemplate = roleTemplates.find(t => t.id === assignmentForm.roleTemplateId)
    
    if (!user || !project || !roleTemplate) return

    setIsAssigning(true)

    try {
      const response = await fetch(`/api/projects/${assignmentForm.projectId}/team-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role: roleTemplate.role,
          pay_rate: assignmentForm.payRate || roleTemplate.base_pay_rate || undefined
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Assigned ${user.full_name} to ${project.name} as ${roleTemplate.display_name}`,
        })
        
        // Refresh team assignments to show new assignment
        await fetchTeamAssignments()
        
        // Close popover and reset form
        setAssignPopoverOpen(null)
        setAssignmentForm({
          projectId: '',
          roleTemplateId: '',
          payRate: ''
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to assign user to project')
      }
    } catch (error) {
      console.error('Error assigning user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign user to project",
        variant: "destructive"
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleBulkAssignToProject = async () => {
    if (!bulkAssignmentForm.projectId || !bulkAssignmentForm.roleTemplateId) {
      toast({
        title: "Missing Information",
        description: "Please select both a project and role template.",
        variant: "destructive"
      })
      return
    }

    if (selectedUsers.size === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select at least one team member to assign.",
        variant: "destructive"
      })
      return
    }

    const project = projects.find(p => p.id === bulkAssignmentForm.projectId)
    const roleTemplate = roleTemplates.find(t => t.id === bulkAssignmentForm.roleTemplateId)
    
    if (!project || !roleTemplate) return

    setIsBulkAssigning(true)

    try {
      const selectedUserIds = Array.from(selectedUsers)
      const promises = selectedUserIds.map(userId =>
        fetch(`/api/projects/${bulkAssignmentForm.projectId}/team-assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            role: roleTemplate.role,
            pay_rate: bulkAssignmentForm.payRate || roleTemplate.base_pay_rate || undefined
          })
        })
      )

      await Promise.all(promises)
      
      toast({
        title: "Success",
        description: `Assigned ${selectedUserIds.length} team members to ${project.name} as ${roleTemplate.display_name}`,
      })
      
      // Refresh team assignments to show new assignments
      await fetchTeamAssignments()
      
      // Close popover, reset form, and clear selection
      setBulkAssignPopoverOpen(false)
      setBulkAssignmentForm({
        projectId: '',
        roleTemplateId: '',
        payRate: ''
      })
      setSelectedUsers(new Set())
    } catch (error) {
      console.error('Error bulk assigning users:', error)
      toast({
        title: "Error",
        description: "Failed to assign team members to project",
        variant: "destructive"
      })
    } finally {
      setIsBulkAssigning(false)
    }
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

  // Show loading state while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show access denied if user doesn't have proper permissions
  if (userProfile && !canAccessAdminFeatures) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the Team management page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Users className="w-4 h-4 mr-1" />
            {approvedUsers.length} Active Members
          </Badge>
          {pendingUsers.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {pendingUsers.length} Pending Approval
            </Badge>
          )}
        </div>
      </div>

      {/* Pending Approvals Section */}
      <PendingUsersTable 
        users={pendingUsers}
        onUsersApproved={fetchTeamData}
        loading={loading}
      />

      {/* Active Team Members Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Active Team Members ({approvedUsers.length})
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
                    placeholder="Search team members by name or email..."
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

          {/* Team Members Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 min-h-[40px]">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
                      setSelectedUsers(new Set())
                    } else {
                      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
                    }
                  }}
                >
                  {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'} ({filteredUsers.length})
                </Button>
                {selectedUsers.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers(new Set())}
                    >
                      Clear Selected
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedUsers.size} selected
                    </span>
                  </>
                )}
              </div>
              
              {/* Bulk Assignment Actions */}
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2">
                  {/* Project Selection Dropdown */}
                  <Select 
                    value={bulkAssignmentForm.projectId || 'none'} 
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setBulkAssignmentForm(prev => ({ ...prev, projectId: '', roleTemplateId: '', payRate: '' }))
                      } else {
                        setBulkAssignmentForm(prev => ({ ...prev, projectId: value, roleTemplateId: '', payRate: '' }))
                      }
                    }}
                  >
                    <SelectTrigger className="w-48 h-9">
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select project...</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} ({project.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Role Template Selection Dropdown */}
                  <Select 
                    value={bulkAssignmentForm.roleTemplateId || 'none'} 
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setBulkAssignmentForm(prev => ({ ...prev, roleTemplateId: '', payRate: '' }))
                      } else {
                        const template = roleTemplates.find(t => t.id === value)
                        setBulkAssignmentForm(prev => ({ 
                          ...prev, 
                          roleTemplateId: value,
                          payRate: template?.base_pay_rate || ''
                        }))
                      }
                    }}
                    disabled={!bulkAssignmentForm.projectId}
                  >
                    <SelectTrigger className="w-48 h-9">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select role...</SelectItem>
                      {bulkProjectRoleTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Pay Rate Input Field */}
                  <Input
                    type="number"
                    placeholder="Pay rate..."
                    value={bulkAssignmentForm.payRate}
                    onChange={(e) => setBulkAssignmentForm(prev => ({ 
                      ...prev, 
                      payRate: e.target.value ? Number(e.target.value) : '' 
                    }))}
                    className="w-32 h-9"
                    disabled={!bulkAssignmentForm.roleTemplateId}
                  />
                  
                  {/* Assign Button */}
                  <Button 
                    size="sm"
                    onClick={handleBulkAssignToProject}
                    disabled={!bulkAssignmentForm.projectId || !bulkAssignmentForm.roleTemplateId || isBulkAssigning}
                  >
                    {isBulkAssigning ? 'Assigning...' : `Assign ${selectedUsers.size}`}
                  </Button>
                </div>
              )}
              
              {selectedUsers.size === 0 && (
                <div className="flex items-center gap-2">
                  <Button 
                    disabled 
                    size="sm"
                    className="opacity-50"
                  >
                    Assign to Project
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.has(user.id)
                return (
                  <Card 
                    key={user.id} 
                    className={`relative transition-all cursor-pointer border-2 py-0 ${
                      isSelected 
                        ? 'bg-card border-primary shadow-md' 
                        : 'hover:shadow-md border-border hover:border-muted-foreground/20'
                    }`}
                    onClick={() => {
                      const newSelected = new Set(selectedUsers)
                      if (isSelected) {
                        newSelected.delete(user.id)
                      } else {
                        newSelected.add(user.id)
                      }
                      setSelectedUsers(newSelected)
                    }}
                  >
                    <CardContent className="px-4 py-3">
                      <div className="space-y-2.5">
                        <div>
                          <h4 className={`font-medium text-base leading-tight ${
                            isSelected ? 'text-foreground' : ''
                          }`}>
                            {user.full_name}
                          </h4>
                          <p className="text-sm truncate text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        
                        {/* User Info Section */}
                        <div className="space-y-1.5">
                          {user.role && (
                            <Badge variant="outline" className={`text-sm ${getRoleColor(user.role)}`}>
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          )}
                          
                          {user.nearest_major_city && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{user.nearest_major_city}</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Flight Status | Project Badge | Assign Button */}
                        <div className="flex items-center justify-between">
                          {/* Flight Status - Left */}
                          <div className="flex-1">
                            {user.willing_to_fly !== undefined && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Plane className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{user.willing_to_fly ? 'Will fly' : 'Local only'}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Project Badge - Center */}
                          <div className="flex-1 flex justify-center">
                            {(() => {
                              const userAssignments = getUserProjectAssignments(user.id)
                              if (userAssignments.length > 0) {
                                const tooltipContent = userAssignments.map(a => (
                                  <div key={a.id} className="text-sm leading-relaxed">
                                    <span className="font-semibold text-foreground">{a.projects.name}</span>
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
                                        setSelectedUserForModal(user.id)
                                        setProjectModalOpen(true)
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

                          {/* Assign Button - Right */}
                          <div className="flex-1 flex justify-end">
                            {/* Simplified Assign Button with Popover */}
                            <Popover 
                              open={assignPopoverOpen === user.id} 
                              onOpenChange={(open) => {
                                if (open) {
                                  setAssignPopoverOpen(user.id)
                                  setAssignmentForm({
                                    projectId: '',
                                    roleTemplateId: '',
                                    payRate: ''
                                  })
                                } else {
                                  setAssignPopoverOpen(null)
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button 
                                  size="sm" 
                                  className="h-7 text-xs px-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Assign
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3" align="start">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">Assign {user.full_name}</div>
                                  
                                  <div className="space-y-2">
                                    <Label className="text-xs">Select Project</Label>
                                    <Select 
                                      value={assignmentForm.projectId || 'none'} 
                                      onValueChange={(value) => {
                                        if (value === 'none') {
                                          setAssignmentForm(prev => ({ ...prev, projectId: '', roleTemplateId: '', payRate: '' }))
                                        } else {
                                          setAssignmentForm(prev => ({ ...prev, projectId: value, roleTemplateId: '', payRate: '' }))
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 w-full">
                                        <SelectValue placeholder="Select project..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Select project...</SelectItem>
                                        {projects.map(project => (
                                          <SelectItem key={project.id} value={project.id}>
                                            {project.name} ({project.status})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label className="text-xs">Select Role Template</Label>
                                    <Select 
                                      value={assignmentForm.roleTemplateId || 'none'} 
                                      onValueChange={(value) => {
                                        if (value === 'none') {
                                          setAssignmentForm(prev => ({ ...prev, roleTemplateId: '', payRate: '' }))
                                        } else {
                                          const template = roleTemplates.find(t => t.id === value)
                                          setAssignmentForm(prev => ({ 
                                            ...prev, 
                                            roleTemplateId: value,
                                            payRate: template?.base_pay_rate || ''
                                          }))
                                        }
                                      }}
                                      disabled={!assignmentForm.projectId}
                                    >
                                      <SelectTrigger className="h-8 w-full">
                                        <SelectValue placeholder="Select role template..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Select role template...</SelectItem>
                                        {projectRoleTemplates.map(template => (
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
                                      value={assignmentForm.payRate}
                                      onChange={(e) => setAssignmentForm(prev => ({ 
                                        ...prev, 
                                        payRate: e.target.value ? Number(e.target.value) : '' 
                                      }))}
                                      className="h-8"
                                    />
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleAssignToProject(user.id)}
                                      disabled={!assignmentForm.projectId || !assignmentForm.roleTemplateId || isAssigning}
                                      className="flex-1"
                                    >
                                      {isAssigning ? 'Assigning...' : 'Assign'}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setAssignPopoverOpen(null)}
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
            
            {filteredUsers.length === 0 && approvedUsers.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No team members match your current filters</p>
              </div>
            )}
            
            {approvedUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active team members found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Details Modal for Mobile */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUserForModal && (
                <>
                  {approvedUsers.find(u => u.id === selectedUserForModal)?.full_name}'s Projects
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedUserForModal && getUserProjectAssignments(selectedUserForModal).map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{assignment.projects.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getRoleDisplayName(assignment.role)} • {assignment.projects.status}
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs ${getRoleColor(assignment.role)}`}>
                  {getRoleDisplayName(assignment.role)}
                </Badge>
              </div>
            ))}
            {selectedUserForModal && getUserProjectAssignments(selectedUserForModal).length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No active project assignments
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
