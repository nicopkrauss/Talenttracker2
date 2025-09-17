"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, 
  Star, 
  Clock, 
  AlertTriangle,
  Search,
  CheckCircle2,
  Circle,
  Coffee,
  RefreshCw
} from 'lucide-react'
import { EnhancedProject } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { TimeTrackingActionBar } from './time-tracking-action-bar'
import { LocationTrackingWidget, LocationTrackingPanel } from './location-tracking-panel'
import { useAuth } from '@/lib/auth-context'
import { PhaseTimeTrackingGuard, PhaseLocationTrackingGuard, PhaseOperationsGuard } from './phase-feature-availability-guard'

interface TalentLocationStatus {
  id: string
  talent_id: string
  talent_name: string
  current_location?: string
  status: 'not_arrived' | 'on_location' | 'on_break' | 'departed'
  last_updated: string
  escort_name?: string
}

interface TeamMemberStatus {
  id: string
  user_id: string
  user_name: string
  role: string
  check_in_time?: string
  shift_duration_hours?: number
  status: 'checked_out' | 'checked_in' | 'on_break'
  alert_level: 'none' | 'warning' | 'critical'
}

interface LiveProjectData {
  talentLocations: TalentLocationStatus[]
  teamStatus: TeamMemberStatus[]
  kpis: {
    staffCheckedIn: number
    talentPresent: number
    activeEscorts: number
    staffOvertime: {
      over8Hours: number
      over12Hours: number
    }
  }
}

interface OperationsDashboardProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function OperationsDashboard({ project }: OperationsDashboardProps) {
  // Always call hooks at the top level in the same order
  const { userProfile } = useAuth()
  const [liveData, setLiveData] = useState<LiveProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const supabase = createClient()

  // Fetch live project data
  const fetchLiveData = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/live-status`)
      if (response.ok) {
        const result = await response.json()
        setLiveData(result.data)
      }
    } catch (error) {
      console.error('Error fetching live data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchLiveData()
  }, [project.id])

  // Set up real-time subscriptions with debouncing
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout

    const debouncedFetchLiveData = () => {
      clearTimeout(debounceTimeout)
      debounceTimeout = setTimeout(fetchLiveData, 1000) // 1 second debounce
    }

    const talentChannel = supabase
      .channel('talent-status-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'talent_status',
        filter: `project_id=eq.${project.id}`
      }, debouncedFetchLiveData)
      .subscribe()

    const shiftsChannel = supabase
      .channel('shifts-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shifts',
        filter: `project_id=eq.${project.id}`
      }, debouncedFetchLiveData)
      .subscribe()

    return () => {
      clearTimeout(debounceTimeout)
      supabase.removeChannel(talentChannel)
      supabase.removeChannel(shiftsChannel)
    }
  }, [project.id, supabase])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchLiveData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Handle staff selection
  const handleStaffSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedStaff(prev => [...prev, userId])
    } else {
      setSelectedStaff(prev => prev.filter(id => id !== userId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allStaffIds = liveData?.teamStatus.map(member => member.user_id) || []
      setSelectedStaff(allStaffIds)
    } else {
      setSelectedStaff([])
    }
  }

  // Handle bulk staff actions
  const handleBulkAction = async (action: 'checkout' | 'start_break' | 'end_break') => {
    if (selectedStaff.length === 0) return

    try {
      const response = await fetch(`/api/projects/${project.id}/staff-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: selectedStaff,
          action
        })
      })

      if (response.ok) {
        setSelectedStaff([])
        fetchLiveData()
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
    }
  }

  // Handle talent location update
  const handleTalentLocationUpdate = async (talentId: string, locationName: string) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/talent-location-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talent_id: talentId,
          location_name: locationName
        })
      })

      if (response.ok) {
        fetchLiveData()
      }
    } catch (error) {
      console.error('Error updating talent location:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading live data...</span>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_location':
      case 'checked_in':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'on_break':
        return <Coffee className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'not_arrived':
      case 'checked_out':
      case 'departed':
        return <Circle className="h-4 w-4 text-muted-foreground" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string, alertLevel?: 'none' | 'warning' | 'critical') => {
    if (alertLevel === 'critical') {
      return <Badge variant="destructive" className="text-xs">🔴 Over 12hrs</Badge>
    }
    if (alertLevel === 'warning') {
      return <Badge variant="secondary" className="text-xs bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300">⚠ Over 8hrs</Badge>
    }
    
    switch (status) {
      case 'on_location':
      case 'checked_in':
        return <Badge variant="default" className="text-xs bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">✓ Active</Badge>
      case 'on_break':
        return <Badge variant="secondary" className="text-xs bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300">🟡 Break</Badge>
      case 'not_arrived':
        return <Badge variant="outline" className="text-xs">⚠ Not Arr.</Badge>
      case 'checked_out':
      case 'departed':
        return <Badge variant="outline" className="text-xs">⚪ Out</Badge>
      default:
        return null
    }
  }

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}.${m.toString().padStart(2, '0')}hrs`
  }

  // Filter talent and team data based on search
  const filteredTalentData = liveData?.talentLocations.filter(talent =>
    talent.talent_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    talent.current_location?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    talent.escort_name?.toLowerCase().includes(searchFilter.toLowerCase())
  ) || []

  const filteredTeamData = liveData?.teamStatus.filter(member =>
    member.user_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    member.role.toLowerCase().includes(searchFilter.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      {/* Time Tracking Action Bar - Phase-aware availability */}
      {userProfile && (
        <PhaseTimeTrackingGuard projectId={project.id}>
          <TimeTrackingActionBar
            projectId={project.id}
            projectName={project.name}
            userId={userProfile.id}
          />
        </PhaseTimeTrackingGuard>
      )}

      {/* Location Tracking Widget - Phase-aware availability */}
      <PhaseLocationTrackingGuard projectId={project.id}>
        <LocationTrackingWidget projectId={project.id} />
      </PhaseLocationTrackingGuard>

      {/* Live KPIs Section - Phase-aware availability */}
      <PhaseOperationsGuard projectId={project.id}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Live Project Status
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {liveData?.kpis.staffCheckedIn || 0}/{project.statistics.staffAssigned || 0}
              </div>
              <div className="text-sm text-muted-foreground">Staff Checked In</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {liveData?.kpis.talentPresent || 0}/{project.statistics.talentExpected || 0}
              </div>
              <div className="text-sm text-muted-foreground">Talent Present</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {liveData?.kpis.activeEscorts || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {(liveData?.kpis.activeEscorts || 0) === 1 ? 'Active Escort' : 'Active Escorts'}
              </div>
            </div>
          </div>
          
          {/* Overtime Alerts */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span>
                {liveData?.kpis.staffOvertime.over8Hours || 0} {(liveData?.kpis.staffOvertime.over8Hours || 0) === 1 ? 'Staff member' : 'Staff'} over 8hrs
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>
                {liveData?.kpis.staffOvertime.over12Hours || 0} {(liveData?.kpis.staffOvertime.over12Hours || 0) === 1 ? 'Staff member' : 'Staff'} over 12hrs
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchLiveData}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
      </PhaseOperationsGuard>

      {/* Talent Locations Board - Phase-aware availability */}
      <PhaseLocationTrackingGuard projectId={project.id}>
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Talent Location Tracking
            </CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search talent, location, escort..." 
                className="w-48"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTalentData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchFilter ? 'No talent found matching your search.' : 'No talent data available.'}
              </div>
            ) : (
              filteredTalentData.map((talent) => (
                <div key={talent.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(talent.status)}
                    <div>
                      <div className="font-medium">{talent.talent_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {talent.escort_name ? `Escort: ${talent.escort_name}` : 'No escort assigned'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(talent.status)}
                    <div className="text-sm font-medium min-w-[80px]">
                      {talent.current_location || '—'}
                    </div>
                    <div className="flex gap-1">
                      {talent.status === 'on_location' && talent.current_location !== 'House' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleTalentLocationUpdate(talent.talent_id, 'House')}
                        >
                          → House
                        </Button>
                      )}
                      {talent.status === 'on_location' && talent.current_location !== 'Holding' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleTalentLocationUpdate(talent.talent_id, 'Holding')}
                        >
                          → Holding
                        </Button>
                      )}
                      {talent.status === 'on_location' && talent.current_location !== 'Stage' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleTalentLocationUpdate(talent.talent_id, 'Stage')}
                        >
                          → Stage
                        </Button>
                      )}
                      {talent.status === 'not_arrived' && (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="text-xs"
                          onClick={() => handleTalentLocationUpdate(talent.talent_id, 'House')}
                        >
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </PhaseLocationTrackingGuard>

      {/* Team Status Board - Phase-aware availability */}
      <PhaseTimeTrackingGuard projectId={project.id}>
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Team Status & Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTeamData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchFilter ? 'No team members found matching your search.' : 'No team data available.'}
              </div>
            ) : (
              filteredTeamData.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedStaff.includes(member.user_id)}
                      onCheckedChange={(checked) => 
                        handleStaffSelection(member.user_id, checked as boolean)
                      }
                    />
                    {getStatusIcon(member.status)}
                    <div>
                      <div className="font-medium">{member.user_name}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {member.role.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(member.status, member.alert_level)}
                    <div className="text-sm font-medium min-w-[70px]">
                      {member.shift_duration_hours ? formatDuration(member.shift_duration_hours) : '—'}
                    </div>
                    <div className="flex gap-1">
                      {member.status === 'checked_in' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleBulkAction('start_break')}
                          >
                            Break
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleBulkAction('checkout')}
                          >
                            Checkout
                          </Button>
                        </>
                      )}
                      {member.status === 'on_break' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleBulkAction('end_break')}
                        >
                          End Break
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Supervisor Controls */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedStaff.length === filteredTeamData.length && filteredTeamData.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label className="text-sm font-medium">
                Select All ({selectedStaff.length} selected)
              </label>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={selectedStaff.length === 0}
                onClick={() => handleBulkAction('start_break')}
              >
                Start Break
              </Button>
              <Button 
                variant="outline" 
                disabled={selectedStaff.length === 0}
                onClick={() => handleBulkAction('end_break')}
              >
                End Break
              </Button>
              <Button 
                variant="default" 
                disabled={selectedStaff.length === 0}
                onClick={() => handleBulkAction('checkout')}
              >
                Checkout Selected
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </PhaseTimeTrackingGuard>
    </div>
  )
}