"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Save, X, Edit2, GripVertical, Check, Palette, ChevronDown, ChevronRight } from 'lucide-react'
import { TrashButton } from '@/components/ui/trash-button'
import { EnhancedProject, ProjectLocation } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { InfoTabDashboardOptimized } from '@/components/projects/info-tab-dashboard-optimized'
import { useToast } from '@/hooks/use-toast'
import { useReadiness } from '@/lib/contexts/readiness-context'

interface InfoTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function InfoTab({ project, onProjectUpdate }: InfoTabProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [description, setDescription] = useState(project.description || '')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [locations, setLocations] = useState<ProjectLocation[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationAbbrev, setNewLocationAbbrev] = useState('')
  const [newLocationColor, setNewLocationColor] = useState('hsl(221 83% 53%)')
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [editingLocation, setEditingLocation] = useState<string | null>(null)
  const [editLocationData, setEditLocationData] = useState<Partial<ProjectLocation>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [customColorForNew, setCustomColorForNew] = useState<string | null>(null)
  const [customColorForEdit, setCustomColorForEdit] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    locationId: string | null
    locationName: string | null
  }>({
    isOpen: false,
    locationId: null,
    locationName: null
  })
  
  // Collapsible section state
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(true)
  const [isLocationsOpen, setIsLocationsOpen] = useState(true)
  
  // Refs for hidden color inputs
  const newColorInputRef = useRef<HTMLInputElement>(null)
  const editColorInputRef = useRef<HTMLInputElement>(null)

  // Load project locations
  useEffect(() => {
    loadLocations()
  }, [project.id])

  const loadLocations = async () => {
    try {
      setIsLoadingLocations(true)
      
      if (!user) {
        console.warn('No user found, skipping location load')
        return
      }

      const response = await fetch(`/api/projects/${project.id}/locations`)

      if (!response.ok) {
        throw new Error('Failed to load locations')
      }

      const result = await response.json()
      setLocations(result.data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setIsLoadingLocations(false)
    }
  }

  const handleSaveDescription = async () => {
    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No user found')
      }

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update description')
      }

      setIsEditingDescription(false)
      await onProjectUpdate()
    } catch (error) {
      console.error('Error updating description:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLocationsComplete = project.project_setup_checklist?.locations_completed || false
  const hasLocations = locations.length > 0

  const { invalidateReadiness } = useReadiness()

  const handleFinalizeLocations = async () => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/projects/${project.id}/readiness/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'locations' })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to finalize locations')
      }

      toast({
        title: "Success",
        description: "Locations finalized successfully",
      })

      // Invalidate readiness cache to trigger refresh
      await invalidateReadiness('location_change')
      await onProjectUpdate()
    } catch (error) {
      console.error('Error finalizing locations:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize locations",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Dashboard - Always at top */}
      <InfoTabDashboardOptimized 
        project={project}
      />
      
      {/* Description Section - Collapsible */}
      <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Project Description
                  {isDescriptionOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CardTitle>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {isEditingDescription ? (
                <div className="space-y-3">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter project description..."
                    rows={4}
                    disabled={isSubmitting}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveDescription} 
                      size="sm" 
                      className="gap-2"
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4" />
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDescription(project.description || '')
                        setIsEditingDescription(false)
                      }}
                      size="sm"
                      className="gap-2"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="min-h-[100px] p-3 border rounded-md bg-muted/50">
                    {description || (
                      <span className="text-muted-foreground italic">
                        No description provided. Click edit to add one.
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingDescription(true)}
                    size="sm"
                    disabled={isSubmitting}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Description
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Talent Locations Manager - Collapsible with Finalization */}
      <Collapsible open={isLocationsOpen} onOpenChange={setIsLocationsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2">
                    Talent Locations
                    {isLocationsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {hasLocations && !isLocationsComplete && (
                    <Button 
                      onClick={handleFinalizeLocations}
                      size="sm"
                      className="gap-2"
                      disabled={isSubmitting}
                    >
                      <Check className="h-4 w-4" />
                      {isSubmitting ? 'Finalizing...' : 'Finalize'}
                    </Button>
                  )}
                  {isLocationsComplete && (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Finalized
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Existing Locations */}
                {isLoadingLocations ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading locations...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <div 
                        key={location.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                            style={{ backgroundColor: location.color || 'hsl(221 83% 53%)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              <span className="truncate">{location.name}</span>
                              <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                {location.abbreviation || 'N/A'}
                              </span>
                              {location.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Location Button */}
                {!isAddingLocation && (
                  <Button 
                    onClick={() => setIsAddingLocation(true)}
                    variant="outline" 
                    className="w-full gap-2"
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                    Add Location
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}