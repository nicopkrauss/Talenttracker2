"use client"

import React, { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Plus, X, AlertTriangle, CheckCircle } from "lucide-react"
import type { TalentProfile, TalentProjectAssignment } from "@/lib/types"
import { talentProjectAssignmentSchema } from "@/lib/types"

interface Project {
  id: string
  name: string
  status: string
  created_at: string
}

interface TalentProjectManagerProps {
  talent: TalentProfile
  onUpdate: () => void
}

export function TalentProjectManager({ talent, onUpdate }: TalentProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentAssignments, setCurrentAssignments] = useState<TalentProjectAssignment[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchData()
  }, [talent.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all available projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, status, created_at")
        .order("name")

      if (projectsError) throw projectsError

      // Fetch current assignments for this talent
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("talent_project_assignments")
        .select(`
          *,
          projects (
            id,
            name,
            status
          )
        `)
        .eq("talent_id", talent.id)
        .eq("status", "active")

      if (assignmentsError) throw assignmentsError

      setProjects(projectsData || [])
      setCurrentAssignments(assignmentsData || [])
    } catch (error) {
      console.error("Error fetching project data:", error)
      setErrors({ fetch: "Failed to load project data. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const handleProjectSelection = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects(prev => [...prev, projectId])
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== projectId))
    }
  }

  const assignToProjects = async () => {
    if (selectedProjects.length === 0) {
      setErrors({ assign: "Please select at least one project to assign." })
      return
    }

    setSaving(true)
    setErrors({})

    try {
      // Get current user for assigned_by field
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Create assignment records for each selected project
      const assignments = selectedProjects.map(projectId => ({
        talent_id: talent.id,
        project_id: projectId,
        assigned_by: user.id,
        status: 'active' as const,
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Validate each assignment
      for (const assignment of assignments) {
        try {
          talentProjectAssignmentSchema.parse(assignment)
        } catch (validationError: any) {
          throw new Error(`Validation failed: ${validationError.message}`)
        }
      }

      const { error } = await supabase
        .from("talent_project_assignments")
        .insert(assignments)

      if (error) throw error

      setSuccessMessage(`Successfully assigned ${talent.first_name} ${talent.last_name} to ${selectedProjects.length} project(s).`)
      setSelectedProjects([])
      await fetchData()
      onUpdate()
    } catch (error: any) {
      console.error("Error assigning to projects:", error)
      setErrors({ assign: error.message || "Failed to assign to projects. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  const removeFromProject = async (assignmentId: string, projectName: string) => {
    setRemoving(assignmentId)
    setErrors({})

    try {
      const { error } = await supabase
        .from("talent_project_assignments")
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq("id", assignmentId)

      if (error) throw error

      setSuccessMessage(`Successfully removed ${talent.first_name} ${talent.last_name} from ${projectName}.`)
      await fetchData()
      onUpdate()
    } catch (error: any) {
      console.error("Error removing from project:", error)
      setErrors({ remove: error.message || "Failed to remove from project. Please try again." })
    } finally {
      setRemoving(null)
    }
  }

  // Get projects that are not currently assigned
  const availableProjects = projects.filter(project => 
    !currentAssignments.some(assignment => assignment.project_id === project.id)
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Messages */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {Object.values(errors).join(" ")}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Assignments */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Current Project Assignments</h3>
          
          {currentAssignments.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No active project assignments</p>
              <p className="text-sm">Use the section below to assign this talent to projects.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">
                      {assignment.projects?.name || "Unknown Project"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromProject(assignment.id, assignment.projects?.name || "Unknown Project")}
                    disabled={removing === assignment.id}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {removing === assignment.id ? (
                      "Removing..."
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Assign to New Projects */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Assign to Additional Projects</h3>
          
          {availableProjects.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No additional projects available</p>
              <p className="text-sm">This talent is already assigned to all available projects.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select one or more projects to assign this talent to:
                </p>
                
                <div className="grid gap-3 max-h-60 overflow-y-auto">
                  {availableProjects.map((project) => (
                    <div key={project.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => 
                          handleProjectSelection(project.id, checked as boolean)
                        }
                      />
                      <label 
                        htmlFor={`project-${project.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{project.name}</span>
                          <Badge 
                            variant={project.status === 'active' ? 'default' : 'secondary'}
                            className="ml-2"
                          >
                            {project.status}
                          </Badge>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={assignToProjects}
                disabled={saving || selectedProjects.length === 0}
                className="w-full"
              >
                {saving ? (
                  "Assigning..."
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Assign to {selectedProjects.length} Project{selectedProjects.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}