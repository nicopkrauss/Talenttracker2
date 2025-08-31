"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Save, X, Edit2, Trash2, GripVertical, Check, Palette } from 'lucide-react'
import { EnhancedProject, ProjectLocation } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'

interface InfoTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function InfoTab({ project, onProjectUpdate }: InfoTabProps) {
  const { user } = useAuth()
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
  
  // Refs for hidden color inputs
  const newColorInputRef = useRef<HTMLInputElement>(null)
  const editColorInputRef = useRef<HTMLInputElement>(null)

  // Get colors currently in use to filter them out from presets
  const getUsedColors = () => {
    const usedColors = new Set<string>()
    locations.forEach(location => {
      if (location.color) {
        usedColors.add(location.color.toLowerCase())
      }
    })
    return usedColors
  }

  // All available preset colors (15 distinct, easily distinguishable colors)
  // Using CSS custom properties that work with both light and dark themes
  const allPresetColors = [
    'hsl(221 83% 53%)', // blue-500
    'hsl(258 90% 66%)', // violet-500  
    'hsl(330 81% 60%)', // pink-500
    'hsl(188 86% 53%)', // cyan-500
    'hsl(84 81% 44%)', // lime-500
    'hsl(21 90% 48%)', // orange-500
    'hsl(239 84% 67%)', // indigo-500
    'hsl(173 80% 40%)', // teal-500
    'hsl(271 91% 65%)', // purple-500
    'hsl(142 76% 36%)', // green-500
    'hsl(54 91% 68%)', // yellow-500
    'hsl(347 77% 50%)', // rose-500
    'hsl(199 89% 48%)', // sky-500
    'hsl(25 75% 47%)', // brown equivalent
    'hsl(215 16% 47%)', // slate-500
  ]

  // Filter out colors that are currently in use
  const getAvailablePresetColors = () => {
    const usedColors = getUsedColors()
    return allPresetColors.filter(color => {
      // Convert HSL to hex for comparison (simplified)
      const normalizedColor = color.toLowerCase()
      return !Array.from(usedColors).some(used => 
        normalizedColor.includes(used.replace('#', '')) || 
        used.includes(normalizedColor.replace(/[^\d]/g, ''))
      )
    })
  }

  // Get theme-aware color with proper contrast
  const getThemeAwareColor = (color: string) => {
    // For location badges, ensure good contrast in both themes
    return color
  }

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

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return

    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No user found')
      }

      const response = await fetch(`/api/projects/${project.id}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newLocationName,
          abbreviation: newLocationAbbrev || newLocationName.substring(0, 2).toUpperCase(),
          color: newLocationColor,
          is_default: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add location')
      }

      setNewLocationName('')
      setNewLocationAbbrev('')
      setNewLocationColor('hsl(221 83% 53%)')
      setIsAddingLocation(false)
      await loadLocations()
    } catch (error) {
      console.error('Error adding location:', error)
      alert(error instanceof Error ? error.message : 'Failed to add location')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditLocation = (location: ProjectLocation) => {
    setEditingLocation(location.id)
    setEditLocationData({
      name: location.name,
      abbreviation: location.abbreviation,
      color: location.color
    })
  }

  const handleSaveLocationEdit = async (locationId: string) => {
    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No user found')
      }

      const response = await fetch(`/api/projects/${project.id}/locations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId,
          ...editLocationData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update location')
      }

      setEditingLocation(null)
      setEditLocationData({})
      await loadLocations()
    } catch (error) {
      console.error('Error updating location:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId)
    setDeleteConfirmation({
      isOpen: true,
      locationId,
      locationName: location?.name || 'this location'
    })
  }

  const confirmDeleteLocation = async () => {
    const locationId = deleteConfirmation.locationId
    if (!locationId) return

    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No user found')
      }

      const response = await fetch(`/api/projects/${project.id}/locations?locationId=${locationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete location')
      }

      await loadLocations()
      setDeleteConfirmation({ isOpen: false, locationId: null, locationName: null })
    } catch (error) {
      console.error('Error deleting location:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete location')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteLocations = async () => {
    try {
      setIsSubmitting(true)
      
      if (!user) {
        throw new Error('No user found')
      }

      const response = await fetch(`/api/projects/${project.id}/locations/complete`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to complete locations checklist')
      }

      await onProjectUpdate()
    } catch (error) {
      console.error('Error completing locations checklist:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, locationId: string) => {
    setDraggedItem(locationId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetLocationId: string) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem === targetLocationId) {
      setDraggedItem(null)
      return
    }

    try {
      setIsSubmitting(true)
      
      // Find the dragged and target locations
      const draggedLocation = locations.find(loc => loc.id === draggedItem)
      const targetLocation = locations.find(loc => loc.id === targetLocationId)
      
      if (!draggedLocation || !targetLocation) {
        throw new Error('Could not find locations for reordering')
      }

      // Create new order array
      const newLocations = [...locations]
      const draggedIndex = newLocations.findIndex(loc => loc.id === draggedItem)
      const targetIndex = newLocations.findIndex(loc => loc.id === targetLocationId)
      
      // Remove dragged item and insert at target position
      const [removed] = newLocations.splice(draggedIndex, 1)
      newLocations.splice(targetIndex, 0, removed)
      
      // Update sort orders
      const updatedLocations = newLocations.map((loc, index) => ({
        ...loc,
        sort_order: index + 1
      }))
      
      // Update local state immediately for better UX
      setLocations(updatedLocations)
      
      // Send batch update to server
      const response = await fetch(`/api/projects/${project.id}/locations/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locations: updatedLocations.map(loc => ({
            id: loc.id,
            sort_order: loc.sort_order
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reorder locations')
      }
      
      // Reload to ensure consistency
      await loadLocations()
    } catch (error) {
      console.error('Error reordering locations:', error)
      // Reload on error to restore correct order
      await loadLocations()
    } finally {
      setDraggedItem(null)
      setIsSubmitting(false)
    }
  }

  const resetColorPickers = () => {
    setCustomColorForNew(null)
    setCustomColorForEdit(null)
  }

  const isLocationsComplete = project.project_setup_checklist?.locations_completed || false
  const hasLocations = locations.length > 0

  return (
    <div className="space-y-6">
      {/* Description Section */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
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
      </Card>

      {/* Talent Locations Manager */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Talent Locations Manager</CardTitle>
          {hasLocations && !isLocationsComplete && (
            <Button 
              onClick={handleCompleteLocations}
              size="sm"
              className="gap-2"
              disabled={isSubmitting}
            >
              <Check className="h-4 w-4" />
              Mark Complete
            </Button>
          )}
          {isLocationsComplete && (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              Complete
            </Badge>
          )}
        </CardHeader>
        <CardContent>
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
                    className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                      draggedItem === location.id ? 'opacity-50 scale-95' : ''
                    } ${draggedItem && draggedItem !== location.id ? 'border-dashed border-primary/50' : ''}`}
                    draggable={!isSubmitting && editingLocation !== location.id}
                    onDragStart={(e) => handleDragStart(e, location.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, location.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical 
                        className={`h-4 w-4 text-muted-foreground ${
                          !isSubmitting && editingLocation !== location.id ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                        }`} 
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: location.color || 'hsl(221 83% 53%)' }}
                      />
                      <div className="flex-1 min-w-0">
                        {editingLocation === location.id ? (
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-5">
                              <Input
                                value={editLocationData.name || ''}
                                onChange={(e) => setEditLocationData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Location name"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                value={editLocationData.abbreviation || ''}
                                onChange={(e) => setEditLocationData(prev => ({ ...prev, abbreviation: e.target.value }))}
                                placeholder="ABC"
                                maxLength={3}
                                className="h-8 text-center"
                              />
                            </div>
                            <div className="col-span-5">
                              <div className="space-y-2">
                                {/* Preset Colors */}
                                <div className="flex gap-1 flex-wrap relative">
                                  {getAvailablePresetColors().map((color) => (
                                    <button
                                      key={color}
                                      type="button"
                                      className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                                        editLocationData.color === color ? 'border-foreground shadow-md' : 'border-border'
                                      }`}
                                      style={{ backgroundColor: color }}
                                      onClick={() => {
                                        setEditLocationData(prev => ({ ...prev, color }))
                                        setCustomColorForEdit(null)
                                      }}
                                    />
                                  ))}
                                  <button
                                    type="button"
                                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center relative overflow-hidden ${
                                      customColorForEdit ? 'border-foreground shadow-md' : 'border-border'
                                    }`}
                                    style={{
                                      backgroundColor: customColorForEdit || 'transparent'
                                    }}
                                    onClick={() => editColorInputRef.current?.click()}
                                  >
                                    {!customColorForEdit && (
                                      <div 
                                        className="absolute inset-0 opacity-80"
                                        style={{ 
                                          background: 'conic-gradient(from 0deg, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(0 100% 50%))'
                                        }}
                                      />
                                    )}
                                    <Palette className="h-3 w-3 text-primary-foreground drop-shadow relative z-10" />
                                  </button>
                                  {/* Hidden color input positioned near button */}
                                  <input
                                    ref={editColorInputRef}
                                    type="color"
                                    value={customColorForEdit || 'hsl(221 83% 53%)'}
                                    onChange={(e) => {
                                      const newColor = e.target.value
                                      setCustomColorForEdit(newColor)
                                      setEditLocationData(prev => ({ ...prev, color: newColor }))
                                    }}
                                    className="absolute opacity-0 pointer-events-none w-6 h-6"
                                    style={{ left: '100%', top: '0' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {editingLocation === location.id ? (
                        <>
                          <Button 
                            onClick={() => {
                              handleSaveLocationEdit(location.id)
                              resetColorPickers()
                            }}
                            size="sm"
                            variant="default"
                            disabled={isSubmitting}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => {
                              setEditingLocation(null)
                              setEditLocationData({})
                              resetColorPickers()
                            }}
                            size="sm"
                            variant="outline"
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            onClick={() => {
                              handleEditLocation(location)
                              resetColorPickers()
                            }}
                            size="sm"
                            variant="outline"
                            disabled={isSubmitting}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {!location.is_default && (
                            <Button 
                              onClick={() => handleDeleteLocation(location.id)}
                              size="sm"
                              variant="outline"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Location */}
            {isAddingLocation ? (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Location name"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Abbreviation</label>
                    <Input
                      value={newLocationAbbrev}
                      onChange={(e) => setNewLocationAbbrev(e.target.value)}
                      placeholder="ABC"
                      maxLength={3}
                      className="text-center"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="text-sm font-medium">Color</label>
                    <div className="space-y-2">
                      {/* Preset Colors */}
                      <div className="flex gap-1 flex-wrap relative">
                        {getAvailablePresetColors().map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                              newLocationColor === color ? 'border-foreground shadow-md' : 'border-border'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setNewLocationColor(color)
                              setCustomColorForNew(null)
                            }}
                            disabled={isSubmitting}
                          />
                        ))}
                        <button
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center relative overflow-hidden ${
                            customColorForNew ? 'border-foreground shadow-md' : 'border-border'
                          }`}
                          style={{
                            backgroundColor: customColorForNew || 'transparent'
                          }}
                          onClick={() => newColorInputRef.current?.click()}
                          disabled={isSubmitting}
                        >
                          {!customColorForNew && (
                            <div 
                              className="absolute inset-0 opacity-80"
                              style={{ 
                                background: 'conic-gradient(from 0deg, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(0 100% 50%))'
                              }}
                            />
                          )}
                          <Palette className="h-4 w-4 text-primary-foreground drop-shadow relative z-10" />
                        </button>
                        {/* Hidden color input positioned near button */}
                        <input
                          ref={newColorInputRef}
                          type="color"
                          value={customColorForNew || 'hsl(221 83% 53%)'}
                          onChange={(e) => {
                            const newColor = e.target.value
                            setCustomColorForNew(newColor)
                            setNewLocationColor(newColor)
                          }}
                          className="absolute opacity-0 pointer-events-none w-8 h-8"
                          style={{ left: '100%', top: '0' }}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddLocation} 
                    size="sm" 
                    className="gap-2"
                    disabled={isSubmitting || !newLocationName.trim()}
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Adding...' : 'Add Location'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingLocation(false)
                      setNewLocationName('')
                      setNewLocationAbbrev('')
                      setNewLocationColor('hsl(221 83% 53%)')
                      resetColorPickers()
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
              <Button 
                variant="outline" 
                onClick={() => setIsAddingLocation(true)}
                className="gap-2"
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            )}

            {/* Default Locations Info */}
            {locations.length === 0 && !isLoadingLocations && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No locations defined yet.</p>
                <p className="text-sm">Default locations (House, Holding, Stage) will be created automatically when you add your first location.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => 
        setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmation.locationName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeleteConfirmation({ isOpen: false, locationId: null, locationName: null })}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteLocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}