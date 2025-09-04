/**
 * TalentLocationTracker Component
 * 
 * NOTE: This component is designed for PROJECT-SPECIFIC talent location tracking.
 * It should NOT be used in global talent profile pages, as location tracking
 * is project-based and requires a specific project context.
 * 
 * This component should be used within:
 * - Project-specific talent management pages
 * - Operations dashboards for active projects
 * - Project talent roster views
 * 
 * It should NOT be used in:
 * - Global talent profile pages (/talent/[id])
 * - General talent listing pages
 * - Cross-project talent views
 */

"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, User } from "lucide-react"
import type { TalentStatus, TalentLocation } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface TalentLocationTrackerProps {
  talentId: string
  projectId: string
  currentStatus?: TalentStatus
  onLocationUpdate: () => void
}

export function TalentLocationTracker({
  talentId,
  projectId,
  currentStatus,
  onLocationUpdate,
}: TalentLocationTrackerProps) {
  const [selectedLocationId, setSelectedLocationId] = useState("")
  const [updating, setUpdating] = useState(false)
  const [projectLocations, setProjectLocations] = useState<TalentLocation[]>([])
  const [locationHistory, setLocationHistory] = useState<TalentStatus[]>([])
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchProjectLocations()
    fetchLocationHistory()
  }, [projectId, talentId])

  const fetchProjectLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("project_locations")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })

      if (error) throw error
      setProjectLocations(data || [])
    } catch (error) {
      console.error("Error fetching project locations:", error)
    }
  }

  const fetchLocationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("talent_status")
        .select(`
          *,
          current_location:project_locations(name, color),
          updated_by_profile:profiles(full_name)
        `)
        .eq("talent_id", talentId)
        .eq("project_id", projectId)
        .order("last_updated", { ascending: false })
        .limit(10)

      if (error) throw error
      setLocationHistory(data || [])
    } catch (error) {
      console.error("Error fetching location history:", error)
    }
  }

  const updateLocation = async () => {
    if (!selectedLocationId) return

    setUpdating(true)
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Get the selected location name for the API call
      const selectedLocation = projectLocations.find(loc => loc.id === selectedLocationId)
      if (!selectedLocation) throw new Error("Selected location not found")

      // Use the existing API endpoint for location updates
      const response = await fetch(`/api/projects/${projectId}/talent-location-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          talent_id: talentId,
          location_name: selectedLocation.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update location')
      }

      setSelectedLocationId("")
      onLocationUpdate()
      fetchLocationHistory()
    } catch (error) {
      console.error("Error updating location:", error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStatus?.current_location ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{currentStatus.current_location.name}</p>
                <p className="text-sm text-muted-foreground">
                  Last updated {formatDistanceToNow(new Date(currentStatus.last_updated))} ago
                </p>
              </div>
              <Badge 
                variant="outline" 
                className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                style={{ 
                  backgroundColor: currentStatus.current_location.color ? `${currentStatus.current_location.color}20` : undefined,
                  borderColor: currentStatus.current_location.color || undefined 
                }}
              >
                {currentStatus.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">No location recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Update Location */}
      <Card>
        <CardHeader>
          <CardTitle>Update Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select new location..." />
              </SelectTrigger>
              <SelectContent>
                {projectLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: location.color || '#3b82f6' }}
                      />
                      <span>{location.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={updateLocation} disabled={!selectedLocationId || updating}>
              {updating ? "Updating..." : "Update"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Location History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locationHistory.length > 0 ? (
            <div className="space-y-3">
              {locationHistory.map((status) => (
                <div key={status.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: status.current_location?.color || '#3b82f6' }}
                    />
                    <div>
                      <p className="font-medium">{status.current_location?.name || 'Unknown Location'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(status.last_updated))} ago
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="w-4 h-4 mr-1" />
                      {status.updated_by_profile?.full_name || 'Staff'}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {status.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No location history available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
