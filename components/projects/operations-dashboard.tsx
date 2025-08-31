"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Star, 
  Clock, 
  AlertTriangle,
  Search,
  CheckCircle2,
  Circle,
  Coffee
} from 'lucide-react'
import { EnhancedProject } from '@/lib/types'

interface OperationsDashboardProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function OperationsDashboard({ project, onProjectUpdate }: OperationsDashboardProps) {
  // Mock data for demonstration - in real implementation, this would come from API
  const mockTalentData = [
    { id: '1', name: 'Celebrity A', status: 'present', location: 'House', escort: 'John Doe' },
    { id: '2', name: 'Celebrity B', status: 'present', location: 'Stage', escort: 'Jane Smith' },
    { id: '3', name: 'Celebrity C', status: 'not_arrived', location: null, escort: null },
    { id: '4', name: 'Celebrity D', status: 'present', location: 'Holding', escort: 'Mike Wilson' }
  ]

  const mockTeamData = [
    { id: '1', name: 'John Doe', role: 'Supervisor', status: 'active', timeWorked: '6.5hrs', overtime: false },
    { id: '2', name: 'Jane Smith', role: 'Supervisor', status: 'break', timeWorked: '8.2hrs', overtime: 'warning' },
    { id: '3', name: 'Mike Wilson', role: 'Escort', status: 'active', timeWorked: '12.1hrs', overtime: 'critical' },
    { id: '4', name: 'Sarah Brown', role: 'Escort', status: 'out', timeWorked: '7.8hrs', overtime: false }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'break':
        return <Coffee className="h-4 w-4 text-yellow-600" />
      case 'not_arrived':
      case 'out':
        return <Circle className="h-4 w-4 text-gray-400" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string, overtime?: string | boolean) => {
    if (overtime === 'critical') {
      return <Badge variant="destructive" className="text-xs">🔴 Over 12hrs</Badge>
    }
    if (overtime === 'warning') {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">⚠ Over 8hrs</Badge>
    }
    
    switch (status) {
      case 'present':
      case 'active':
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">✓ Active</Badge>
      case 'break':
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">🟡 Break</Badge>
      case 'not_arrived':
        return <Badge variant="outline" className="text-xs">⚠ Not Arr.</Badge>
      case 'out':
        return <Badge variant="outline" className="text-xs">⚪ Out</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Live KPIs Section */}
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
                {project.statistics.staffCheckedIn || 4}/{project.statistics.staffAssigned || 6}
              </div>
              <div className="text-sm text-muted-foreground">Staff Checked In</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {project.statistics.talentPresent || 8}/{project.statistics.talentExpected || 12}
              </div>
              <div className="text-sm text-muted-foreground">Talent Present</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {project.statistics.activeEscorts || 4}
              </div>
              <div className="text-sm text-muted-foreground">Active Escorts</div>
            </div>
          </div>
          
          {/* Overtime Alerts */}
          <div className="flex gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span>2 Staff over 8hrs</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>1 Staff over 12hrs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Talent Locations Board */}
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
                placeholder="Search/Filter..." 
                className="w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTalentData.map((talent) => (
              <div key={talent.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(talent.status)}
                  <div>
                    <div className="font-medium">{talent.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {talent.escort ? `Escort: ${talent.escort}` : 'No escort assigned'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {getStatusBadge(talent.status)}
                  <div className="text-sm font-medium">
                    {talent.location || '—'}
                  </div>
                  <div className="flex gap-1">
                    {talent.status === 'present' && talent.location !== 'House' && (
                      <Button size="sm" variant="outline" className="text-xs">
                        → House
                      </Button>
                    )}
                    {talent.status === 'present' && talent.location !== 'Holding' && (
                      <Button size="sm" variant="outline" className="text-xs">
                        → Holding
                      </Button>
                    )}
                    {talent.status === 'present' && talent.location !== 'Stage' && (
                      <Button size="sm" variant="outline" className="text-xs">
                        → Stage
                      </Button>
                    )}
                    {talent.status === 'not_arrived' && (
                      <Button size="sm" variant="default" className="text-xs">
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Status Board */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Team Status & Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTeamData.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(member.status)}
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.role}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {getStatusBadge(member.status, member.overtime)}
                  <div className="text-sm font-medium min-w-[60px]">
                    {member.timeWorked}
                  </div>
                  <div className="flex gap-1">
                    {member.status === 'active' && (
                      <Button size="sm" variant="outline">
                        Checkout
                      </Button>
                    )}
                    {member.status === 'break' && (
                      <Button size="sm" variant="default">
                        End Break
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Supervisor Controls */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="select-all" className="rounded" />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All
              </label>
            </div>
            <Button variant="default" className="gap-2">
              Checkout Selected
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}