"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  MapPin, 
  Building2, 
  Clock,
  DollarSign,
  FileText
} from "lucide-react"
import { Project, UserRole } from "@/lib/types"
import { hasAdminAccess } from "@/lib/role-utils"
import { format } from "date-fns"
import { formatDateStringShort, formatDateStringCompact } from "@/lib/date-utils"

interface ProjectTimecardStats {
  projectId: string
  projectName: string
  projectDescription?: string
  productionCompany?: string
  totalTimecards: number
  statusBreakdown: {
    draft: number
    submitted: number
    approved: number
    rejected: number
  }
  totalHours: number
  totalApprovedPay: number
  totalPotentialPay: number
  lastActivity: string | null
  pendingApprovals?: number // Admin only
  overdueSubmissions?: number // Admin only
}

interface TimecardProjectCardProps {
  project: Project
  timecardStats: ProjectTimecardStats
  userRole: UserRole
  onSelectProject: (projectId: string) => void
}

export function TimecardProjectCard({
  project,
  timecardStats,
  userRole,
  onSelectProject
}: TimecardProjectCardProps) {
  const isAdmin = hasAdminAccess(userRole === 'admin' || userRole === 'in_house' ? userRole : null)
  
  const handleSelectProject = () => {
    onSelectProject(project.id)
  }

  const getStatusBadge = (status: keyof ProjectTimecardStats['statusBreakdown'], count: number) => {
    if (count === 0) return null
    
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="text-sm bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800">{count} Draft</Badge>
      case 'submitted':
        return <Badge variant="outline" className="text-sm bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800">{count} Submitted</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-sm bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800">{count} Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-sm bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800">{count} Rejected</Badge>
      default:
        return null
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const getLastActivityText = () => {
    if (!timecardStats.lastActivity) return 'No recent activity'
    
    const lastActivityDate = new Date(timecardStats.lastActivity)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return format(lastActivityDate, 'MMM d, yyyy')
  }

  return (
    <Card 
      className="transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 h-full flex flex-col"
      role="article"
      aria-labelledby={`project-${project.id}-title`}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                id={`project-${project.id}-title`}
                className="font-semibold text-base sm:text-lg truncate text-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={handleSelectProject}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelectProject()
                  }
                }}
                aria-label={`Open ${project.name} project timecards`}
              >
                {project.name}
              </h3>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Last activity: {getLastActivityText()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Project Details */}
        <div className="space-y-2 flex-shrink-0">
          {timecardStats.productionCompany && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80">
              <Building2 
                className="h-4 w-4 flex-shrink-0 text-muted-foreground" 
                aria-hidden="true"
              />
              <span className="truncate" title={timecardStats.productionCompany}>
                {timecardStats.productionCompany}
              </span>
            </div>
          )}
          
          {project.location && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80">
              <MapPin 
                className="h-4 w-4 flex-shrink-0 text-muted-foreground" 
                aria-hidden="true"
              />
              <span className="truncate" title={project.location}>
                {project.location}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80">
            <Calendar 
              className="h-4 w-4 flex-shrink-0 text-muted-foreground" 
              aria-hidden="true"
            />
            <span>
              {(() => {
                try {
                  if (!project.start_date || !project.end_date) return 'Date not available'
                  
                  // Use the date utility functions that handle timezone properly
                  const startFormatted = formatDateStringCompact(project.start_date)
                  const endFormatted = formatDateStringShort(project.end_date)
                  
                  return `${startFormatted} - ${endFormatted}`
                } catch (error) {
                  return 'Date not available'
                }
              })()}
            </span>
          </div>
        </div>

        {/* Timecard Statistics */}
        <div className="space-y-3 flex-1">
          {/* Total Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText 
                className="h-4 w-4 text-muted-foreground flex-shrink-0" 
                aria-hidden="true"
              />
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium text-foreground">
                {timecardStats.totalTimecards} timecard{timecardStats.totalTimecards !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Clock 
                className="h-4 w-4 text-muted-foreground flex-shrink-0" 
                aria-hidden="true"
              />
              <span className="text-muted-foreground">Hours:</span>
              <span className="font-medium text-foreground">{formatHours(timecardStats.totalHours)}</span>
            </div>
          </div>

          {/* Pay Information */}
          {(timecardStats.totalPotentialPay > 0 || timecardStats.totalApprovedPay > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <DollarSign 
                  className="h-4 w-4 text-muted-foreground flex-shrink-0" 
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">Pay:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 ml-6 sm:ml-0">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatCurrency(timecardStats.totalPotentialPay)} potential
                </span>
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(timecardStats.totalApprovedPay)} approved
                </span>
              </div>
            </div>
          )}

          {/* Status Breakdown */}
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {Object.entries(timecardStats.statusBreakdown)
              .filter(([status, count]) => count > 0)
              .map(([status, count]) => 
                getStatusBadge(status as keyof ProjectTimecardStats['statusBreakdown'], count)
              )
              .filter(Boolean)
              .map((badge, index) => (
                <React.Fragment key={index}>{badge}</React.Fragment>
              ))}
          </div>
        </div>

        {/* Description */}
        {timecardStats.projectDescription && (
          <p className="text-xs sm:text-sm text-foreground/70 line-clamp-2 flex-shrink-0">
            {timecardStats.projectDescription}
          </p>
        )}

        {/* Action Button */}
        <div className="pt-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectProject}
            className="w-full min-h-[44px] text-sm"
            aria-label={`View timecards for ${project.name} project`}
          >
            <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
            View Timecards
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}