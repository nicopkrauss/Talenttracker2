"use client"

import React from "react"
import { Calendar, Clock, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectSchedule } from "@/lib/types"
import { formatDateRange } from "@/lib/schedule-utils"

interface ProjectScheduleDisplayProps {
  schedule: ProjectSchedule
  className?: string
  showTitle?: boolean
  compact?: boolean
}

export function ProjectScheduleDisplay({ 
  schedule, 
  className = "",
  showTitle = true,
  compact = false 
}: ProjectScheduleDisplayProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateWithYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        {showTitle && (
          <h4 className="text-sm font-medium text-foreground">Project Schedule</h4>
        )}
        
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Duration:</span>
            <span className="font-medium">{schedule.allDates.length} day{schedule.allDates.length !== 1 ? 's' : ''}</span>
          </div>
          
          {schedule.isSingleDay ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium text-blue-700 dark:text-blue-300">Show Day Only</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rehearsal Days:</span>
                <span className="font-medium text-amber-700 dark:text-amber-300">{schedule.rehearsalDates.length} day{schedule.rehearsalDates.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Show Day:</span>
                <span className="font-medium text-blue-700 dark:text-blue-300">{formatDate(schedule.endDate)}</span>
              </div>
            </>
          )}
          
          <div className="pt-2 border-t border-muted-foreground/20">
            <p className="text-xs text-muted-foreground text-center">
              {formatDateWithYear(schedule.startDate)} - {formatDateWithYear(schedule.endDate)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Project Schedule
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {/* Project Duration */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Duration</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {schedule.allDates.length} day{schedule.allDates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Schedule Breakdown */}
        <div className="space-y-3">
          {schedule.isSingleDay ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Show Day
                </span>
              </div>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {formatDate(schedule.endDate)}
              </span>
            </div>
          ) : (
            <>
              {/* Rehearsal Days */}
              {schedule.rehearsalDates.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Rehearsal Days
                    </span>
                  </div>
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    {schedule.rehearsalDates.length} day{schedule.rehearsalDates.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Show Day */}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Show Day
                  </span>
                </div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {formatDate(schedule.endDate)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Date Range Summary */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {formatDateWithYear(schedule.startDate)} - {formatDateWithYear(schedule.endDate)}
          </p>
        </div>

        {/* Schedule Legend */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Schedule Legend:</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Rehearsal Days</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Show Day</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProjectScheduleDisplay