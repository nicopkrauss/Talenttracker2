"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, X } from 'lucide-react'
import { EnhancedProject } from '@/lib/types'

interface InfoTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function InfoTab({ project, onProjectUpdate }: InfoTabProps) {
  const [description, setDescription] = useState(project.description || '')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationAbbrev, setNewLocationAbbrev] = useState('')
  const [newLocationColor, setNewLocationColor] = useState('#3b82f6')
  const [isAddingLocation, setIsAddingLocation] = useState(false)

  // Mock locations data - in real implementation, this would come from project.project_locations
  const mockLocations = [
    { id: '1', name: 'House', abbreviation: 'H', color: '#10b981', isDefault: true },
    { id: '2', name: 'Holding', abbreviation: 'HD', color: '#f59e0b', isDefault: true },
    { id: '3', name: 'Stage', abbreviation: 'ST', color: '#ef4444', isDefault: true },
    { id: '4', name: 'Catering', abbreviation: 'CT', color: '#8b5cf6', isDefault: false }
  ]

  const handleSaveDescription = async () => {
    try {
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
    }
  }

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return

    try {
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
        throw new Error('Failed to add location')
      }

      setNewLocationName('')
      setNewLocationAbbrev('')
      setNewLocationColor('#3b82f6')
      setIsAddingLocation(false)
      await onProjectUpdate()
    } catch (error) {
      console.error('Error adding location:', error)
    }
  }

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
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveDescription} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDescription(project.description || '')
                    setIsEditingDescription(false)
                  }}
                  size="sm"
                  className="gap-2"
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
              >
                Edit Description
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Talent Locations Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Talent Locations Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Existing Locations */}
            <div className="space-y-2">
              {mockLocations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: location.color }}
                    />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {location.name}
                        {location.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Abbreviation: {location.abbreviation}
                      </div>
                    </div>
                  </div>
                  {!location.isDefault && (
                    <Button variant="outline" size="sm">
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Location */}
            {isAddingLocation ? (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Location name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Abbreviation</label>
                    <Input
                      value={newLocationAbbrev}
                      onChange={(e) => setNewLocationAbbrev(e.target.value)}
                      placeholder="2-3 letters"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newLocationColor}
                        onChange={(e) => setNewLocationColor(e.target.value)}
                        className="w-full h-10 rounded border"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddLocation} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Add Location
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingLocation(false)
                      setNewLocationName('')
                      setNewLocationAbbrev('')
                      setNewLocationColor('#3b82f6')
                    }}
                    size="sm"
                    className="gap-2"
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
              >
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}