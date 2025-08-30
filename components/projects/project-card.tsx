"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar, 
  MapPin, 
  Building2, 
  User, 
  Clock,
  Eye,
  Edit,
  Play,
  Archive,
  FileText
} from "lucide-react"
import { Project, UserRole } from "@/lib/types"
import { hasAdminAccess } from "@/lib/role-utils"
import { format, isAfter, isBefore } from "date-fns"

interface ProjectCardProps {
  project: Project
  userRole: UserRole
  canAccessDetails: boolean
  hasTimecards?: boolean
  onViewProject?: (projectId: string) => void
  onEditProject?: (projectId: string) => void
  onActivateProject?: (projectId: string) => void
  onArchiveProject?: (projectId: string) => void
  onViewTimecard?: (projectId: string) => void
}

export function ProjectCard({
  project,
  userRole,
  canAccessDetails,
  hasTimecards = false,
  onViewProject,
  onEditProject,
  onActivateProject,
  onArchiveProject,
  onViewTimecard
}: ProjectCardProps) {
  const isAdmin = hasAdminAccess(userRole === 'admin' || userRole === 'in_house' ? userRole : null)
  const canEdit = isAdmin && canAccessDetails
  const canActivate = isAdmin && project.status === 'prep' && canAccessDetails
  const canArchive = isAdmin && project.status === 'active' && canAccessDetails
  
  // Calculate project status and progress
  const startDate = new Date(project.start_date)
  const endDate = new Date(project.end_date)
  const today = new Date()
  
  const isUpcoming = isBefore(today, startDate)
  const isActive = !isBefore(today, startDate) && !isAfter(today, endDate)
  const isPast = isAfter(today, endDate)
  
  // Mock setup progress - in real implementation this would come from project_setup_checklist
  const setupProgress = project.status === 'prep' ? 75 : 100
  
  const getStatusBadge = () => {
    switch (project.status) {
      case 'prep':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Prep</Badge>
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'archived':
        return <Badge variant="outline" className="bg-gray-100 text-gray-600">Archived</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getDateStatus = () => {
    if (isUpcoming) {
      return <span className="text-blue-600 text-sm">Starts {format(startDate, 'MMM d, yyyy')}</span>
    }
    if (isActive) {
      return <span className="text-green-600 text-sm">Ends {format(endDate, 'MMM d, yyyy')}</span>
    }
    if (isPast) {
      return <span className="text-gray-500 text-sm">Ended {format(endDate, 'MMM d, yyyy')}</span>
    }
    return null
  }

  const handleViewProject = () => {
    if (canAccessDetails && onViewProject) {
      onViewProject(project.id)
    }
  }

  const handleEditProject = () => {
    if (canEdit && onEditProject) {
      onEditProject(project.id)
    }
  }

  const handleActivateProject = () => {
    if (canActivate && onActivateProject) {
      onActivateProject(project.id)
    }
  }

  const handleArchiveProject = () => {
    if (canArchive && onArchiveProject) {
      onArchiveProject(project.id)
    }
  }

  const handleViewTimecard = () => {
    if (hasTimecards && onViewTimecard) {
      onViewTimecard(project.id)
    }
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      canAccessDetails ? 'cursor-pointer' : 'opacity-75'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                className="font-semibold text-lg truncate text-foreground"
                onClick={handleViewProject}
              >
                {project.name}
              </h3>
              {getStatusBadge()}
            </div>
            {getDateStatus()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project Details */}
        <div className="space-y-2">
          {project.production_company && (
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{project.production_company}</span>
            </div>
          )}
          
          {project.project_location && (
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{project.project_location}</span>
            </div>
          )}
          
          {project.hiring_contact && (
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{project.hiring_contact}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-foreground/80">
            <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Setup Progress (for prep projects) */}
        {project.status === 'prep' && canAccessDetails && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Setup Progress</span>
              <span className="font-medium text-foreground">{setupProgress}%</span>
            </div>
            <Progress value={setupProgress} className="h-2" />
          </div>
        )}

        {/* Description */}
        {project.description && (
          <p className="text-sm text-foreground/70 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {canAccessDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewProject}
              className="flex-1 min-w-0"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditProject}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}

          {canActivate && (
            <Button
              variant="default"
              size="sm"
              onClick={handleActivateProject}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Activate
            </Button>
          )}

          {canArchive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveProject}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          )}

          {/* Show timecard button for non-admin users with restricted access */}
          {!canAccessDetails && hasTimecards && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewTimecard}
              className="flex-1 min-w-0"
            >
              <FileText className="h-4 w-4 mr-1" />
              View My Timecard
            </Button>
          )}
        </div>

        {/* Access Restriction Message */}
        {!canAccessDetails && !hasTimecards && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Project access restricted
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}