"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, 
  Users, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  Navigation,
  Lock
} from 'lucide-react'
import { LocationTrackingGuard } from './feature-availability-guard'
import { useLocationTrackingFeatureAvailability } from '@/hooks/use-feature-availability'

interface TalentLocation {
  id: string
  name: string
  currentLocation: string
  locationId: string
  lastUpdated: string
  escortName?: string
  status: 'on_time' | 'delayed' | 'missing' | 'arrived'
}

interface ProjectLocation {
  id: string
  name: string
  color: string
  talentCount: number
  capacity?: number
}

interface LocationTrackingPanelProps {
  projectId: string
  projectName: string
  onLocationUpdate?: (talentId: string, locationId: string) => void
  className?: string
}

export function LocationTrackingPanel({
  projectId,
  projectName,
  onLocationUpdate,
  className
}: LocationTrackingPanelProps) {
  const [talentLocations, setTalentLocations] = useState<TalentLocation[]>([])
  const [projectLocations, setProjectLocations] = useState<ProjectLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const featureCheck = useLocationTrackingFeatureAvailability(projectId)

  // Simulate data loading
  useEffect(() => {
    loadLocationData()
  }, [projectId])

  const loadLocationData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock data
      setProjectLocations([
        { id: '1', name: 'House', color: '#3b82f6', talentCount: 5, capacity: 10 },
        { id: '2', name: 'Holding', color: '#f59e0b', talentCount: 3, capacity: 8 },
        { id: '3', name: 'Stage', color: '#ef4444', talentCount: 2, capacity: 6 },
        { id: '4', name: 'Wardrobe', color: '#8b5cf6', talentCount: 1, capacity: 4 }
      ])

      setTalentLocations([
        {
          id: '1',
          name: 'John Doe',
          currentLocation: 'House',
          locationId: '1',
          lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          escortName: 'Alice Smith',
          status: 'on_time'
        },
        {
          id: '2',
          name: 'Jane Smith',
          currentLocation: 'Holding',
          locationId: '2',
          lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          escortName: 'Bob Johnson',
          status: 'delayed'
        },
        {
          id: '3',
          name: 'Mike Johnson',
          currentLocation: 'Stage',
          locationId: '3',
          lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          escortName: 'Carol Davis',
          status: 'arrived'
        }
      ])

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load location data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadLocationData()
  }

  const getStatusColor = (status: TalentLocation['status']) => {
    switch (status) {
      case 'on_time':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'delayed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'missing':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'arrived':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: TalentLocation['status']) => {
    switch (status) {
      case 'on_time':
        return 'On Time'
      case 'delayed':
        return 'Delayed'
      case 'missing':
        return 'Missing'
      case 'arrived':
        return 'Arrived'
      default:
        return 'Unknown'
    }
  }

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    return date.toLocaleDateString()
  }

  return (
    <LocationTrackingGuard 
      projectId={projectId}
      fallback={
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Location Tracking Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>{featureCheck.requirement}</p>
                  {featureCheck.guidance && (
                    <p className="text-sm text-muted-foreground">
                      {featureCheck.guidance}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      }
    >
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Location Tracking - {projectName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Last updated: {formatLastUpdated(lastRefresh.toISOString())}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Location Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {projectLocations.map((location) => (
                <div
                  key={location.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: location.color }}
                      />
                      <h3 className="font-medium">{location.name}</h3>
                    </div>
                    <Badge variant="secondary">
                      {location.talentCount}
                      {location.capacity && ` / ${location.capacity}`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {location.talentCount} talent
                      {location.capacity && location.talentCount >= location.capacity && (
                        <span className="text-yellow-600 ml-1">(at capacity)</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Talent Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Talent Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : talentLocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No talent location data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {talentLocations.map((talent) => (
                  <div
                    key={talent.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-4 h-4 rounded-full mb-1"
                          style={{
                            backgroundColor: projectLocations.find(l => l.id === talent.locationId)?.color || '#gray'
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {talent.currentLocation}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">{talent.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {talent.escortName && (
                            <>
                              <span>with {talent.escortName}</span>
                              <span>•</span>
                            </>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatLastUpdated(talent.lastUpdated)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Badge className={getStatusColor(talent.status)}>
                      {getStatusText(talent.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LocationTrackingGuard>
  )
}

/**
 * Compact location tracking widget for dashboards
 */
export function LocationTrackingWidget({
  projectId,
  className
}: {
  projectId: string
  className?: string
}) {
  const [summary, setSummary] = useState({
    totalTalent: 0,
    onTime: 0,
    delayed: 0,
    missing: 0
  })

  const featureCheck = useLocationTrackingFeatureAvailability(projectId)

  useEffect(() => {
    // Mock data loading
    setSummary({
      totalTalent: 12,
      onTime: 8,
      delayed: 3,
      missing: 1
    })
  }, [projectId])

  if (!featureCheck.available) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Location Tracking</p>
              <p className="text-xs text-muted-foreground">Not available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Navigation className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Location Tracking</p>
              <p className="text-xs text-muted-foreground">
                {summary.totalTalent} talent tracked
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 text-xs">
              {summary.onTime} on time
            </Badge>
            {summary.delayed > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                {summary.delayed} delayed
              </Badge>
            )}
            {summary.missing > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                {summary.missing} missing
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}