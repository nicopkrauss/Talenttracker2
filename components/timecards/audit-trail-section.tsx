"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { Button } from '@/components/ui/button'
import { Clock, AlertCircle, Edit3, Shield, AlertTriangle, List, ArrowRight } from 'lucide-react'
import { AuditLogEntry, AuditLogResponse, ValueFormatter } from '@/lib/audit-log-service'
import { Badge } from '@/components/ui/badge'
import { parseDate } from '@/lib/timezone-utils'

interface AuditTrailSectionProps {
  timecardId: string
  className?: string
}

interface AuditTrailState {
  data: AuditLogEntry[]
  loading: boolean
  error: string | null
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export function AuditTrailSection({ timecardId, className }: AuditTrailSectionProps) {
  const [state, setState] = useState<AuditTrailState>({
    data: [],
    loading: true,
    error: null,
    pagination: {
      total: 0,
      limit: 10, // Show fewer items initially
      offset: 0,
      has_more: false
    }
  })

  // Fetch audit logs (ungrouped to show individual field changes)
  const fetchAuditLogs = async (offset = 0) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const params = new URLSearchParams({
        limit: '10',
        offset: offset.toString(),
        grouped: 'false'
      })

      const response = await fetch(`/api/timecards/${timecardId}/audit-logs?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch audit logs')
      }

      const result: AuditLogResponse = await response.json()

      // Convert string dates to Date objects and transform to individual entries
      const processedData = (result.auditLogs as any[]).map((entry: any, index: number) => ({
        ...entry,
        // Ensure each entry has a unique ID for React keys
        id: entry.id || `entry-${index}-${Date.now()}`,
        changed_at: new Date(entry.changed_at),
        work_date: entry.work_date ? parseDate(entry.work_date) : null
      }))



      setState(prev => ({
        ...prev,
        data: offset === 0 ? processedData : [...prev.data, ...processedData],
        pagination: result.pagination,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }))
    }
  }

  // Initial load
  useEffect(() => {
    fetchAuditLogs(0)
  }, [timecardId])

  // Load more entries
  const loadMore = () => {
    if (!state.loading && state.pagination.has_more) {
      fetchAuditLogs(state.pagination.offset + state.pagination.limit)
    }
  }

  // Status badge component for status changes
  const StatusBadge = ({ status }: { status: string }) => {
    // Handle 'edited_draft' status display as 'draft (edited)' for better UX
    const displayStatus = status === 'edited_draft' ? 'draft (edited)' : status
    
    switch (status) {
      case 'draft':
      case 'edited_draft':
        return (
          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800">
            {displayStatus}
          </Badge>
        )
      case 'submitted':
        return (
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800">
            {displayStatus}
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800">
            {displayStatus}
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800">
            {displayStatus}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {displayStatus}
          </Badge>
        )
    }
  }

  // Get action type configuration
  const getActionTypeConfig = (actionType: string) => {
    switch (actionType) {
      case 'user_edit':
        return {
          variant: 'secondary' as const,
          icon: Edit3,
          label: 'User Edit',
          color: 'text-blue-600 dark:text-blue-400'
        }
      case 'admin_edit':
        return {
          variant: 'default' as const,
          icon: Shield,
          label: 'Admin Edit',
          color: 'text-purple-600 dark:text-purple-400'
        }
      case 'rejection_edit':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          label: 'Rejection Edit',
          color: 'text-red-600 dark:text-red-400'
        }
      case 'status_change':
        return {
          variant: 'outline' as const,
          icon: ArrowRight,
          label: 'Status Change',
          color: 'text-green-600 dark:text-green-400'
        }
      default:
        return {
          variant: 'outline' as const,
          icon: Edit3,
          label: actionType,
          color: 'text-muted-foreground'
        }
    }
  }

  // Format timestamp for display - show actual time and date for audit precision
  const formatTimestamp = (date: Date) => {
    // Validate the date
    if (!date || isNaN(date.getTime())) {
      return 'Invalid date'
    }
    
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString()
    
    // Format time (e.g., "6:22 AM")
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    // Format date based on recency
    if (isToday) {
      return `${timeStr} today`
    } else if (isYesterday) {
      return `${timeStr} yesterday`
    } else {
      // Format date (e.g., "Sep 28")
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
      return `${timeStr} on ${dateStr}`
    }
  }

  // Generate change summary with date for individual entry
  const getChangeSummary = (entry: AuditLogEntry) => {
    // Handle status changes differently
    if (entry.action_type === 'status_change') {
      return 'Status changed to'
    }
    
    // Use work_date if available (the date the work was performed), 
    // otherwise fall back to changed_at (when the change was made)
    const relevantDate = entry.work_date || entry.changed_at
    const dateStr = relevantDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    
    const formattedFieldName = ValueFormatter.formatFieldName(entry.field_name)
    
    return `${formattedFieldName} on ${dateStr}`
  }

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg border">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  )

  // Render error state
  const renderError = () => (
    <div className="text-center py-6">
      <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-3">
        Failed to load change log: {state.error}
      </p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => fetchAuditLogs(0)}
      >
        Try Again
      </Button>
    </div>
  )

  // Render empty state
  const renderEmptyState = () => (
    <div className="text-center py-6">
      <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">
        No changes recorded for this timecard
      </p>
    </div>
  )

  // Render change log entries
  const renderChangeLogEntries = () => {
    if (state.data.length === 0) {
      return renderEmptyState()
    }

    return (
      <div className="space-y-2">
        {state.data.map((entry, index) => {
          const actionConfig = getActionTypeConfig(entry.action_type)
          const ActionIcon = actionConfig.icon
          const userDisplayName = entry.changed_by_profile?.full_name || 'Unknown User'
          const changeSummary = getChangeSummary(entry)
          const timestamp = formatTimestamp(entry.changed_at)
          
          // Ensure we have a unique key
          const uniqueKey = entry.id || `audit-entry-${index}-${entry.change_id || 'no-change-id'}`

          return (
            <div key={uniqueKey} className="py-2 px-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              {/* Desktop: Single row layout */}
              <div className="hidden sm:flex sm:items-center sm:justify-between">
                {/* Left side - Change information */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <ActionIcon className={`h-4 w-4 flex-shrink-0 ${actionConfig.color}`} />
                  
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground truncate">
                      {changeSummary}
                    </span>
                    
                    {/* For status changes, show the status badge */}
                    {entry.action_type === 'status_change' ? (
                      <StatusBadge status={entry.new_value || ''} />
                    ) : (
                      <>
                        {/* Divider */}
                        <span className="text-muted-foreground">|</span>
                        
                        {/* Show the value change inline */}
                        <div className="flex items-center gap-1 text-sm text-foreground">
                          <span>
                            {ValueFormatter.formatOldValue(entry.field_name || '', entry.old_value)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">
                            {ValueFormatter.formatNewValue(entry.field_name || '', entry.new_value)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side - User and timestamp */}
                <div className="flex items-center gap-3 flex-shrink-0 text-sm text-foreground">
                  <span className="text-muted-foreground">{userDisplayName}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{timestamp}</span>
                </div>
              </div>

              {/* Mobile: Two-column grid layout */}
              <div className="sm:hidden grid grid-cols-[auto_1fr] gap-3">
                {/* Left column - Icon (vertically centered) */}
                <div className="flex items-center justify-center">
                  <ActionIcon className={`h-3 w-3 flex-shrink-0 ${actionConfig.color}`} />
                </div>
                
                {/* Right column - All content (same layout as before) */}
                <div>
                  {/* Top row - Field description (left) and User name (right) */}
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="font-medium text-xs text-foreground truncate flex-1 min-w-0">
                      {changeSummary}
                    </span>
                    
                    {/* User name - top right */}
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {userDisplayName}
                    </span>
                  </div>

                  {/* Bottom row - Time change/Status badge (left) and Timestamp (right) */}
                  <div className="flex items-center justify-between gap-3">
                    {/* For status changes, show the status badge */}
                    {entry.action_type === 'status_change' ? (
                      <StatusBadge status={entry.new_value || ''} />
                    ) : (
                      /* Time change - bottom left */
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <span>
                          {ValueFormatter.formatOldValue(entry.field_name || '', entry.old_value)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">
                          {ValueFormatter.formatNewValue(entry.field_name || '', entry.new_value)}
                        </span>
                      </div>
                    )}
                    
                    {/* Timestamp - bottom right */}
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Load more button */}
        {state.pagination.has_more && (
          <div className="flex justify-center pt-3">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={state.loading}
              size="sm"
            >
              {state.loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <List className="w-5 h-5 mr-2" />
          Change Log
        </CardTitle>
      </CardHeader>
      <CardContent>

        {state.loading && state.data.length === 0 ? (
          renderLoadingSkeleton()
        ) : state.error ? (
          renderError()
        ) : (
          renderChangeLogEntries()
        )}
      </CardContent>
    </Card>
  )
}