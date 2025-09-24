'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Calendar, Clock, DollarSign, Coffee } from 'lucide-react'

interface DailyEntry {
  date: string
  check_in_time: string
  check_out_time: string
  break_start_time: string
  break_end_time: string
  hours_worked: number
  break_duration: number
  daily_pay: number
  notes?: string
  location?: string
}

interface EnhancedMultiDayDisplayProps {
  timecard: {
    id: string
    date: string
    total_hours: number
    total_pay: number
    break_duration: number
    pay_rate: number
    status: string
    admin_notes?: string
    daily_breakdown?: DailyEntry[]
    // Fallback fields for non-enhanced timecards
    check_in_time?: string
    check_out_time?: string
    break_start_time?: string
    break_end_time?: string
  }
  showActions?: boolean
  onEdit?: () => void
  onSubmit?: () => void
  onApprove?: () => void
  onReject?: () => void
}

export function EnhancedMultiDayDisplay({ 
  timecard, 
  showActions = true,
  onEdit,
  onSubmit,
  onApprove,
  onReject
}: EnhancedMultiDayDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Determine if this is a multi-day timecard
  const dailyBreakdown = timecard.daily_breakdown || []
  const isMultiDay = dailyBreakdown.length > 1
  const workingDays = dailyBreakdown.length || 1
  
  // Extract pattern info from admin_notes
  const extractPatternInfo = (notes?: string) => {
    if (!notes) return { workingDays: 1, description: 'Single day' }
    
    const workingDaysMatch = notes.match(/(\d+) working days/)
    const workingDays = workingDaysMatch ? parseInt(workingDaysMatch[1]) : 1
    
    // Extract description (everything before " - Total of")
    const descriptionMatch = notes.match(/^([^-]+)/)
    const description = descriptionMatch ? descriptionMatch[1].trim() : notes
    
    return { workingDays, description }
  }

  const patternInfo = extractPatternInfo(timecard.admin_notes)
  
  // Calculate averages for multi-day timecards
  const averageHoursPerDay = timecard.total_hours / workingDays
  const averagePayPerDay = timecard.total_pay / workingDays
  const averageBreakPerDay = timecard.break_duration / workingDays

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
    
    // Already in time format
    return timeStr.substring(0, 5) // HH:MM
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              {isMultiDay ? 'Multi-Day Timecard' : 'Single Day Timecard'}
            </CardTitle>
            {isMultiDay && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {workingDays} days
              </Badge>
            )}
            <Badge className={getStatusColor(timecard.status)}>
              {timecard.status}
            </Badge>
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
        
        {isMultiDay && (
          <p className="text-sm text-muted-foreground">
            {patternInfo.description}
          </p>
        )}
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
              <p className="text-sm font-medium">${timecard.total_pay}</p>
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
              <p className="text-sm font-medium">{timecard.break_duration.toFixed(1)}h breaks</p>
              {isMultiDay && (
                <p className="text-xs text-muted-foreground">
                  {(averageBreakPerDay * 60).toFixed(0)}min avg/day
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">${timecard.pay_rate}/h</p>
              <p className="text-xs text-muted-foreground">Pay rate</p>
            </div>
          </div>
        </div>

        {/* Daily Breakdown or Single Day Details */}
        {isMultiDay && dailyBreakdown.length > 0 ? (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="font-medium">Daily Breakdown ({workingDays} days)</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-3 mt-3">
              {dailyBreakdown.map((day, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{formatDate(day.date)}</h4>
                      <div className="text-sm text-muted-foreground">
                        {day.hours_worked}h • ${day.daily_pay}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Check In:</span>
                        <span className="ml-2 font-mono">{formatTime(day.check_in_time)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Check Out:</span>
                        <span className="ml-2 font-mono">{formatTime(day.check_out_time)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Break:</span>
                        <span className="ml-2 font-mono">
                          {formatTime(day.break_start_time)} - {formatTime(day.break_end_time)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Break Duration:</span>
                        <span className="ml-2">{(day.break_duration * 60).toFixed(0)}min</span>
                      </div>
                    </div>
                    
                    {day.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {day.notes}
                      </p>
                    )}
                    
                    {day.location && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Location: {day.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          /* Single Day Details */
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{formatDate(timecard.date)}</h4>
                <div className="text-sm text-muted-foreground">
                  {timecard.total_hours}h • ${timecard.total_pay}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Check In:</span>
                  <span className="ml-2 font-mono">{formatTime(timecard.check_in_time)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Check Out:</span>
                  <span className="ml-2 font-mono">{formatTime(timecard.check_out_time)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Break:</span>
                  <span className="ml-2 font-mono">
                    {formatTime(timecard.break_start_time)} - {formatTime(timecard.break_end_time)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Break Duration:</span>
                  <span className="ml-2">{(timecard.break_duration * 60).toFixed(0)}min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Representative Schedule for Multi-Day (if no daily breakdown) */}
        {isMultiDay && dailyBreakdown.length === 0 && (
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Representative Daily Schedule</h4>
              <p className="text-sm text-muted-foreground mb-3">
                These times represent a typical workday pattern across {workingDays} days
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Typical Check In:</span>
                  <span className="ml-2 font-mono">{formatTime(timecard.check_in_time)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Typical Check Out:</span>
                  <span className="ml-2 font-mono">{formatTime(timecard.check_out_time)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Typical Break:</span>
                  <span className="ml-2 font-mono">
                    {formatTime(timecard.break_start_time)} - {formatTime(timecard.break_end_time)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Break/Day:</span>
                  <span className="ml-2">{(averageBreakPerDay * 60).toFixed(0)}min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}