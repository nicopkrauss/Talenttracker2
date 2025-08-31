"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  MapPin, 
  Building, 
  User, 
  Play,
  Archive,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react'
import { EnhancedProject } from '@/lib/types'
import { useState } from 'react'

interface ProjectOverviewCardProps {
  project: EnhancedProject
  onActivate: () => Promise<void>
  onArchive: () => Promise<void>
  canEdit: boolean
}

export function ProjectOverviewCard({ 
  project, 
  onActivate, 
  onArchive, 
  canEdit 
}: ProjectOverviewCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateSetupProgress = () => {
    if (!project.project_setup_checklist) return 0
    
    const checklist = project.project_setup_checklist
    const completedItems = [
      checklist.roles_and_pay_completed,
      checklist.talent_roster_completed,
      checklist.team_assignments_completed,
      checklist.locations_completed
    ].filter(Boolean).length

    return (completedItems / 4) * 100
  }

  const isSetupComplete = () => {
    if (!project.project_setup_checklist) return false
    
    const checklist = project.project_setup_checklist
    return checklist.roles_and_pay_completed &&
           checklist.talent_roster_completed &&
           checklist.team_assignments_completed &&
           checklist.locations_completed
  }

  const handleActivate = async () => {
    setActionLoading('activate')
    try {
      await onActivate()
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async () => {
    setActionLoading('archive')
    try {
      await onArchive()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Dates and Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Dates:</span>
              <span>{formatDate(project.start_date)} – {formatDate(project.end_date)}</span>
            </div>
            {project.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location:</span>
                <span>{project.location}</span>
              </div>
            )}
          </div>

          {/* Right Column - Production Details */}
          <div className="space-y-3">
            {project.production_company && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Production:</span>
                <span>{project.production_company}</span>
              </div>
            )}
            {project.hiring_contact && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Contact:</span>
                <span>{project.hiring_contact}</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Talent:</span>
            <span>
              {project.statistics.talentExpected} Expected, {project.statistics.talentAssigned} Assigned
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Staff:</span>
            <span>
              {project.statistics.staffNeeded} Needed, {project.statistics.staffAssigned} Assigned
            </span>
          </div>
        </div>

        {/* Setup Checklist (Prep Only) */}
        {project.status === 'prep' && project.project_setup_checklist && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Setup Checklist</h3>
              <Badge variant={isSetupComplete() ? "default" : "secondary"}>
                {Math.round(calculateSetupProgress())}% Complete
              </Badge>
            </div>
            
            <Progress value={calculateSetupProgress()} className="h-2" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                {project.project_setup_checklist.roles_and_pay_completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={project.project_setup_checklist.roles_and_pay_completed ? 'text-green-700 dark:text-green-300' : ''}>
                  Roles & Pay
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                {project.project_setup_checklist.talent_roster_completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={project.project_setup_checklist.talent_roster_completed ? 'text-green-700 dark:text-green-300' : ''}>
                  Talent Roster
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                {project.project_setup_checklist.team_assignments_completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={project.project_setup_checklist.team_assignments_completed ? 'text-green-700 dark:text-green-300' : ''}>
                  Team Assignments
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                {project.project_setup_checklist.locations_completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={project.project_setup_checklist.locations_completed ? 'text-green-700 dark:text-green-300' : ''}>
                  Locations
                </span>
              </div>
            </div>

            {/* Activate Button */}
            {canEdit && isSetupComplete() && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleActivate}
                  disabled={actionLoading === 'activate'}
                  size="lg"
                  className="gap-2"
                >
                  {actionLoading === 'activate' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Set Project to Active
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Archive Button (Active Projects) */}
        {project.status === 'active' && canEdit && (
          <div className="flex justify-end pt-4 border-t">
            <Button 
              variant="outline"
              onClick={handleArchive}
              disabled={actionLoading === 'archive'}
              className="gap-2"
            >
              {actionLoading === 'archive' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              Archive Project
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}