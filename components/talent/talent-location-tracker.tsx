"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, User } from "lucide-react"
import type { LocationUpdate } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface TalentLocationTrackerProps {
  talentId: string
  currentLocation?: string
  locationHistory: LocationUpdate[]
  onLocationUpdate: () => void
}

export function TalentLocationTracker({
  talentId,
  currentLocation,
  locationHistory,
  onLocationUpdate,
}: TalentLocationTrackerProps) {
  const [newLocation, setNewLocation] = useState("")
  const [updating, setUpdating] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const updateLocation = async () => {
    if (!newLocation.trim()) return

    setUpdating(true)
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Insert location update
      const { error: insertError } = await supabase.from("location_updates").insert({
        talent_id: talentId,
        location: newLocation.trim(),
        updated_by: user.id,
        timestamp: new Date().toISOString(),
      })

      if (insertError) throw insertError

      // Update talent profile current location
      const { error: updateError } = await supabase
        .from("talent_profiles")
        .update({
          current_location: newLocation.trim(),
          last_location_update: new Date().toISOString(),
        })
        .eq("id", talentId)

      if (updateError) throw updateError

      setNewLocation("")
      onLocationUpdate()
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
          {currentLocation ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{currentLocation}</p>
                <p className="text-sm text-muted-foreground">Last updated {formatDistanceToNow(new Date())} ago</p>
              </div>
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                Current
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
            <Input
              placeholder="Enter new location..."
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && updateLocation()}
            />
            <Button onClick={updateLocation} disabled={!newLocation.trim() || updating}>
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
              {locationHistory.map((update) => (
                <div key={update.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{update.location}</p>
                    <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(update.timestamp))} ago</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="w-4 h-4 mr-1" />
                      Updated by staff
                    </div>
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
