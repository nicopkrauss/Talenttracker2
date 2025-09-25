"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, ChevronDown, ChevronUp, FileText } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import { getRoleColor, getRoleDisplayName } from "@/lib/role-utils"

interface MultiDayTimecardDisplayProps {
  timecard: Timecard
  showUserName?: boolean
  showAdminNotes?: boolean
  showHeaderStats?: boolean
  showTimecardHeader?: boolean
  defaultExpanded?: boolean
  hideExpandToggle?: boolean
  userProjectRole?: string | null
}

export function MultiDayTimecardDisplay({ timecard, showUserName = false, showAdminNotes = false, showHeaderStats = true, showTimecardHeader = false, defaultExpanded = false, hideExpandToggle = false, userProjectRole = null }: MultiDayTimecardDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Helper function to safely format dates and times
  const safeFormat = (dateString: string | null | undefined, formatString: string, fallback: string = 'Invalid') => {
    if (!dateString) return fallback
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? fallback : format(date, formatString)
  }

  // Use the new multi-day fields from the API
  const isMultiDay = timecard.is_multi_day || false
  const workingDays = timecard.working_days || 1
  const dailyEntries = timecard.daily_entries || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground border-border"
      case "submitted":
        return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
      case "approved":
        return "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
      case "rejected":
        return "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft"
      case "submitted":
        return "Submitted"
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      default:
        return status
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow gap-2">
      {(showUserName || showHeaderStats) && (
        <CardHeader className="pb-0">
          <div className="space-y-3 sm:space-y-0">
            {/* Name and badges row - on desktop this includes stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-start sm:flex-1">
                {showUserName && (
                  <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 flex-1">
                    {/* Mobile: Two-row layout to prevent name wrapping */}
                    <div className="sm:hidden space-y-2">
                      {/* Top row: Name (left) + Status badges (right) */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-lg text-foreground flex-1">
                          {Array.isArray(timecard.profiles)
                            ? timecard.profiles[0]?.full_name || 'Unknown User'
                            : timecard.profiles?.full_name || 'Unknown User'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getStatusColor(timecard.status)}
                          >
                            {getStatusText(timecard.status)}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Bottom row: Role badge (left) + Multi-day badge (right) */}
                      <div className="flex items-center justify-between">
                        <div>
                          {userProjectRole ? (
                            <Badge variant="outline" className={`text-sm ${getRoleColor(userProjectRole)}`}>
                              {getRoleDisplayName(userProjectRole as any)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-sm bg-muted text-muted-foreground border-border">
                              Team Member
                            </Badge>
                          )}
                        </div>
                        <div>
                          {isMultiDay && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              Multi-Day
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop: Single row layout */}
                    <div className="hidden sm:flex sm:items-center sm:gap-3 sm:flex-1">
                      <h3 className="font-semibold text-lg text-foreground">
                        {Array.isArray(timecard.profiles)
                          ? timecard.profiles[0]?.full_name || 'Unknown User'
                          : timecard.profiles?.full_name || 'Unknown User'}
                      </h3>
                      {userProjectRole ? (
                        <Badge variant="outline" className={`text-sm ${getRoleColor(userProjectRole)}`}>
                          {getRoleDisplayName(userProjectRole as any)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-sm bg-muted text-muted-foreground border-border">
                          Team Member
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Desktop: Stats and badges in same row */}
              {showHeaderStats && (
                <div className="hidden sm:flex sm:items-center sm:gap-4">
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-semibold text-foreground">
                      ${(timecard.pay_rate || 0).toFixed(0)}/h
                    </p>
                    <p className="text-xs text-muted-foreground">Rate</p>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-bold text-foreground">
                      {(timecard.total_hours || 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Hours</p>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-bold text-foreground">
                      10
                    </p>
                    <p className="text-xs text-muted-foreground">Adjusted Hours</p>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${(timecard.total_pay || 0).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              )}
              
              {/* Desktop badges */}
              <div className="hidden sm:flex sm:items-center sm:gap-2 sm:ml-4">
                <Badge
                  variant="outline"
                  className={getStatusColor(timecard.status)}
                >
                  {getStatusText(timecard.status)}
                </Badge>
                {isMultiDay && (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Multi-Day
                  </Badge>
                )}
              </div>
            </div>

            {/* Mobile: Stats grid on separate row */}
            {showHeaderStats && (
              <div className="grid grid-cols-2 gap-3 sm:hidden">
                {/* Rate - Top Left on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="text-lg font-semibold text-foreground">
                    ${(timecard.pay_rate || 0).toFixed(0)}/h
                  </p>
                </div>
                
                {/* Hours - Top Right on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground">Hours</p>
                  <p className="text-lg font-bold text-foreground">
                    {(timecard.total_hours || 0).toFixed(1)}
                  </p>
                </div>
                
                {/* Adjusted Hours - Bottom Left on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground">Adjusted Hours</p>
                  <p className="text-lg font-bold text-foreground">
                    10
                  </p>
                </div>
                
                {/* Total - Bottom Right on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${(timecard.total_pay || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      )}

      {showTimecardHeader && (
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Timecard
          </CardTitle>
        </CardHeader>
      )}

      <CardContent>

        {/* Admin Notes Section - Full Display with Good Styling */}
        {timecard.admin_notes && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Admin Notes</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                  {timecard.admin_notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Time Details Section - Show first day by default */}
        {timecard.check_in_time && timecard.check_out_time && (
          <div className="space-y-4">
            {/* First Day (always shown) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  {isMultiDay
                    ? `Day 1 - ${safeFormat(timecard.date, "EEEE, MMM d, yyyy")}`
                    : safeFormat(timecard.date, "EEEE, MMM d, yyyy")
                  }
                </h3>
                {isMultiDay && !hideExpandToggle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsExpanded(!isExpanded)
                    }}
                    className="text-xs"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show {workingDays - 1} More Days
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Time Events Grid - matching timecard details page */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Check In */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Check In</label>
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <p className="text-lg font-semibold text-foreground">
                      {safeFormat(timecard.check_in_time, "h:mm:ss a", "Not recorded")}
                    </p>
                  </div>
                </div>

                {/* Break Start */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Break Start</label>
                  <div className={`p-3 rounded-lg border ${timecard.break_start_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                    {timecard.break_start_time ? (
                      <p className="text-lg font-semibold text-foreground">
                        {safeFormat(timecard.break_start_time, "h:mm:ss a")}
                      </p>
                    ) : (
                      <p className="text-lg font-semibold text-muted-foreground">No break taken</p>
                    )}
                  </div>
                </div>

                {/* Break End */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Break End</label>
                  <div className={`p-3 rounded-lg border ${timecard.break_end_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                    {timecard.break_end_time ? (
                      <p className="text-lg font-semibold text-foreground">
                        {safeFormat(timecard.break_end_time, "h:mm:ss a")}
                      </p>
                    ) : (
                      <p className="text-lg font-semibold text-muted-foreground">No break taken</p>
                    )}
                  </div>
                </div>

                {/* Check Out */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <p className="text-lg font-semibold text-foreground">
                      {safeFormat(timecard.check_out_time, "h:mm:ss a", "Not recorded")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Days (when expanded) */}
            {isMultiDay && isExpanded && dailyEntries.length > 1 && (
              <div className="space-y-0">
                {dailyEntries.slice(1).map((entry, index) => {
                  const dayNumber = index + 2

                  return (
                    <div key={`day-${dayNumber}`} className="space-y-1">
                      {/* Dividing line between days */}
                      <div className="border-t border-border my-4"></div>

                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          Day {dayNumber} - {safeFormat(entry.work_date, "EEEE, MMM d, yyyy")}
                        </h3>
                      </div>

                      {/* Time grid for this specific day */}
                      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Check In</label>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <p className="text-lg font-semibold text-foreground">
                              {safeFormat(entry.check_in_time, "h:mm:ss a", "Not recorded")}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Break Start</label>
                          <div className={`p-3 rounded-lg border ${entry.break_start_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                            {entry.break_start_time ? (
                              <p className="text-lg font-semibold text-foreground">
                                {safeFormat(entry.break_start_time, "h:mm:ss a")}
                              </p>
                            ) : (
                              <p className="text-lg font-semibold text-muted-foreground">No break taken</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Break End</label>
                          <div className={`p-3 rounded-lg border ${entry.break_end_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                            {entry.break_end_time ? (
                              <p className="text-lg font-semibold text-foreground">
                                {safeFormat(entry.break_end_time, "h:mm:ss a")}
                              </p>
                            ) : (
                              <p className="text-lg font-semibold text-muted-foreground">No break taken</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <p className="text-lg font-semibold text-foreground">
                              {safeFormat(entry.check_out_time, "h:mm:ss a", "Not recorded")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}


      </CardContent>
    </Card>
  )
}