'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Calendar, Clock, DollarSign, Coffee, FileText } from 'lucide-react'
import { parseDate } from '@/lib/timezone-utils'

interface DailyEntry {
  id: string
  work_date: string
  check_in_time?: string
  check_out_time?: string
  break_start_time?: string
  break_end_time?: string
  hours_worked: number
  break_duration: number
  daily_pay: number
}

interface TimecardHeader {
  id: string
  user_id: string
  project_id: string
  status: string
  period_start_date: string
  period_end_date: string
  total_hours: number
  total_break_duration: number
  total_pay: number
  pay_rate: number
  admin_notes?: string
  submitted_at?: string
  rejection_reason?: string
  daily_entries: DailyEntry[]
}

interface NormalizedTimecardDisplayProps {
  timecard: TimecardHeader
  showActions?: boolean
  onEdit?: () => void
  onSubmit?: () => void
  onApprove?: () => void
  onReject?: () => void
}

export function NormalizedTimecardDisplay({ 
  timecard, 
  showActions = true,
  onEdit,
  onSubmit,
  onApprove,
  onReject
}: NormalizedTimecardDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Calculate timecard metrics
  const workingDays = timecard.daily_entries.length
  const isMultiDay = workingDays > 1
  const periodDays = Math.ceil((new Date(timecard.period_end_date).getTime() - new Date(timecard.period_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // Calculate averages
  const averageHoursPerDay = workingDays > 0 ? timecard.total_hours / workingDays : 0
  const averagePayPerDay = workingDays > 0 ? timecard.total_pay / workingDays : 0
  const averageBreakPerDay = workingDays > 0 ? timecard.total_break_duration / workingDays : 0

  // Format time for display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--'
    
    // Handle both full datetime and time-only formats
    if (timeStr.includes('T')) {
      return new Date(timeStr).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    }
    
    // Already in time format (HH:MM:SS)
    return timeStr.substring(0, 5) // HH:MM
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr)
    if (!date) return 'Invalid Date'
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format date range
  const formatDateRange = () => {
    if (timecard.period_start_date === timecard.period_end_date) {
      return formatDate(timecard.period_start_date)
    }
    
    return `${formatDate(timecard.period_start_date)} - ${formatDate(timecard.period_end_date)}`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Sort daily entries by date
  const sortedEntries = [...timecard.daily_entries].sort((a, b) => {
    const dateA = parseDate(a.work_date)
    const dateB = parseDate(b.work_date)
    return (dateA?.getTime() || 0) - (dateB?.getTime() || 0)
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              {isMultiDay ? `Multi-Day Timecard (${workingDays} days)` : 'Single Day Timecard'}
            </CardTitle>
            <Badge className={getStatusColor(timecard.status)}>
              {timecard.status}
            </Badge>
            {periodDays !== workingDays && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                {workingDays}/{periodDays} days worked
              </Badge>
            )}
          </div>
          
          {showActions && (
            <div className="flex gap-2">
              {timecard.status === 'draft' && (
                <>
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    Edit
                  </Button>
                  <Button size="sm" onClick={onSubmit}>
                    Submit
                  </Button>
                </>
              )}
              {timecard.status === 'submitted' && (
                <>
                  <Button variant="outline" size="sm" onClick={onReject}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={onApprove}>
                    Approve
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDateRange()}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{timecard.total_hours}h total</p>
              {isMultiDay && (
                <p className="text-xs text-muted-foreground">
                  {averageHoursPerDay.toFixed(1)}h avg/day
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">${timecard.total_pay.toFixed(2)}</p>
              {isMultiDay && (
                <p className="text-xs text-muted-foreground">
                  ${averagePayPerDay.toFixed(0)} avg/day
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{timecard.total_break_duration.toFixed(1)}h breaks</p>
              {isMultiDay && (
                <p className="text-xs text-muted-foreground">
                  {(averageBreakPerDay * 60).toFixed(0)}min avg/day
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">${timecard.pay_rate}/h</p>
              <p className="text-xs text-muted-foreground">Pay rate</p>
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">
                {isMultiDay ? `Daily Breakdown (${workingDays} days)` : 'Day Details'}
              </span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </Collapsible>
          
          <CollapsibleContent className="space-y-3 mt-3">
            {sortedEntries.map((entry, index) => (
              <Card key={entry.id} className={`border-l-4 ${
                isMultiDay ? 'border-l-blue-500' : 'border-l-green-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {formatDate(entry.work_date)}
                      {isMultiDay && (
                        <Badge variant="outline" className="text-xs">
                          Day {index + 1}
                        </Badge>
                      )}
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      {entry.hours_worked}h • ${entry.daily_pay.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Check In:</span>
                      <span className="ml-2 font-mono">{formatTime(entry.check_in_time)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check Out:</span>
                      <span className="ml-2 font-mono">{formatTime(entry.check_out_time)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Break:</span>
                      <span className="ml-2 font-mono">
                        {formatTime(entry.break_start_time)} - {formatTime(entry.break_end_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Break Duration:</span>
                      <span className="ml-2">{(entry.break_duration * 60).toFixed(0)}min</span>
                    </div>
                  </div>
                  
                  {/* Simplified - no individual daily notes or locations */}
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Rejection Reason */}
        {timecard.status === 'rejected' && timecard.rejection_reason && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-red-800 mb-2">Rejection Reason</h4>
              <p className="text-sm text-red-700">{timecard.rejection_reason}</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}