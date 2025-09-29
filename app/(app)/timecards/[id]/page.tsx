"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Clock, Calendar, AlertTriangle, ArrowLeft, Check, X, Edit, Loader2, Save, RotateCcw, AlertCircle, FileText } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { canApproveTimecardsWithSettings } from "@/lib/role-utils"
import { createTimecardCalculationEngine } from "@/lib/timecard-calculation-engine"
import { utcToDatetimeLocal, datetimeLocalToUtc } from "@/lib/timezone-utils"
import { MultiDayTimecardDetail } from "@/components/timecards/multi-day-timecard-detail"
import { AuditTrailSection } from "@/components/timecards/audit-trail-section"

export default function TimecardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const [timecard, setTimecard] = useState<Timecard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [globalSettings, setGlobalSettings] = useState<any>(null)

  // Inline editing states
  const [isEditing, setIsEditing] = useState(false)
  const [isEditAndReturn, setIsEditAndReturn] = useState(false)
  const [editedTimecard, setEditedTimecard] = useState<Partial<Timecard>>({})
  const [calculatedValues, setCalculatedValues] = useState({
    total_hours: 0,
    break_duration: 0,
    total_pay: 0
  })
  const [editLoading, setEditLoading] = useState(false)
  
  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showAdminEditDialog, setShowAdminEditDialog] = useState(false)
  const [showEditReasonDialog, setShowEditReasonDialog] = useState(false)
  const [showEditReturnDialog, setShowEditReturnDialog] = useState(false)
  
  // Admin notes states
  const [isEditingAdminNotes, setIsEditingAdminNotes] = useState(false)
  const [adminNotesValue, setAdminNotesValue] = useState('')
  const [savingAdminNotes, setSavingAdminNotes] = useState(false)
  const [comments, setComments] = useState("")
  const [editReason, setEditReason] = useState("")
  
  // Rejection mode states
  const [isRejectionMode, setIsRejectionMode] = useState(false)
  const [fieldEdits, setFieldEdits] = useState<Record<string, any>>({})
  const [showReasonDialog, setShowReasonDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [loadingRejection, setLoadingRejection] = useState(false)
  
  // Audit trail refresh trigger
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Determine the correct back navigation based on URL params or referrer
  const getBackUrl = () => {
    if (typeof window !== 'undefined') {
      // First check if projectId is in URL params
      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('projectId')
      if (projectId) {
        return `/timecards/project/${projectId}`
      }
      
      // Fallback to referrer-based detection
      const referrer = document.referrer
      if (referrer && referrer.includes('/timecards/project/')) {
        // Extract project ID from referrer URL
        const match = referrer.match(/\/timecards\/project\/([^\/]+)/)
        if (match && match[1]) {
          return `/timecards/project/${match[1]}`
        }
      }
    }
    // Default back to general timecards page
    return '/timecards'
  }

  useEffect(() => {
    if (params.id) {
      fetchTimecard()
      fetchGlobalSettings()
    }
  }, [params.id])

  // Initialize calculated values when timecard loads
  useEffect(() => {
    if (timecard && !isEditing) {
      setCalculatedValues({
        total_hours: timecard.total_hours || 0,
        break_duration: timecard.break_duration || 0,
        total_pay: timecard.total_pay || 0
      })
    }
  }, [timecard, isEditing])

  // Initialize admin notes value when timecard loads
  useEffect(() => {
    if (timecard) {
      setAdminNotesValue(timecard.admin_notes || '')
    }
  }, [timecard])

  const fetchGlobalSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single()
      
      setGlobalSettings(data)
    } catch (error) {
      console.error('Error fetching global settings:', error)
    }
  }

  const fetchTimecard = async () => {
    setError(null)
    try {
      const response = await fetch(`/api/timecards/${params.id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = `API error: ${errorData.error || 'Unknown API error'}`
        console.error("API error fetching timecard:", errorData)
        setError(errorMessage)
        return
      }

      const result = await response.json()
      const timecardData = result.timecard
      
      if (!timecardData) {
        setError("Timecard not found")
        return
      }

      setTimecard(timecardData)
      
      // Note: Rejection mode should only be used when actively rejecting a timecard,
      // not when viewing an already rejected timecard. For rejected timecards,
      // we use showRejectedFields={true} to highlight the rejected fields instead.
    } catch (error) {
      const errorMessage = `Failed to fetch timecard: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error("Error fetching timecard:", error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!timecard) return
    
    setActionLoading('approve')
    try {
      const response = await fetch('/api/timecards/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecard.id,
          comments: comments.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve timecard')
      }

      await fetchTimecard()
      setShowApproveDialog(false)
      setComments("")
      // Trigger audit trail refresh
      setAuditRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error approving timecard:', error)
      setError(error instanceof Error ? error.message : 'Failed to approve timecard')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!timecard || !comments.trim()) return
    
    setActionLoading('reject')
    try {
      const response = await fetch('/api/timecards/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecard.id,
          comments: comments.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject timecard')
      }

      await fetchTimecard()
      setShowRejectDialog(false)
      setComments("")
      // Trigger audit trail refresh
      setAuditRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error rejecting timecard:', error)
      setError(error instanceof Error ? error.message : 'Failed to reject timecard')
    } finally {
      setActionLoading(null)
    }
  }

  // Rejection mode functions
  const enterRejectionMode = () => {
    setIsRejectionMode(true)
    setFieldEdits({})
  }

  const exitRejectionMode = () => {
    setIsRejectionMode(false)
    setFieldEdits({})
  }

  // Helper function to get the original value for a field
  const getOriginalValue = (fieldId: string) => {
    if (fieldId.includes('_day_')) {
      const parts = fieldId.split('_day_')
      const dayIndex = parseInt(parts[1])
      const fieldName = parts[0]

      if (!isNaN(dayIndex) && timecard?.daily_entries && timecard.daily_entries[dayIndex]) {
        return timecard.daily_entries[dayIndex][fieldName as keyof typeof timecard.daily_entries[0]]
      }
    } else {
      return timecard?.[fieldId as keyof typeof timecard]
    }
    return null
  }

  // Helper function to normalize time values for comparison
  const normalizeTimeValue = (timeValue: string | null | undefined): string | null => {
    if (!timeValue) return null
    
    try {
      // If it's already a simple time string (HH:MM:SS), return as-is
      if (timeValue.includes(':') && !timeValue.includes('T')) {
        // Ensure it's in HH:MM:SS format
        const parts = timeValue.split(':')
        if (parts.length >= 2) {
          const hours = parts[0].padStart(2, '0')
          const minutes = parts[1].padStart(2, '0')
          const seconds = parts[2] ? parts[2].padStart(2, '0') : '00'
          return `${hours}:${minutes}:${seconds}`
        }
      }
      
      // If it's an ISO string, parse and extract time
      const date = new Date(timeValue)
      if (isNaN(date.getTime())) return timeValue.trim()
      
      // Extract only the time portion for comparison
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    } catch {
      return timeValue.trim()
    }
  }

  const handleFieldEdit = (fieldId: string, newValue: any) => {
    console.log(`🔧 handleFieldEdit called:`, {
      fieldId,
      newValue,
      newValueType: typeof newValue,
      currentFieldEdits: fieldEdits
    })
    
    setFieldEdits(prev => {
      let newFieldEdits
      if (newValue === undefined) {
        // Remove the field from edits if value is undefined (matches original)
        const { [fieldId]: removed, ...rest } = prev
        newFieldEdits = rest
        console.log(`🗑️ Removing field edit (undefined):`, {
          fieldId,
          removedValue: removed,
          newFieldEdits
        })
      } else {
        // Get the original value for comparison
        const originalValue = getOriginalValue(fieldId)
        
        // Compare normalized values to determine if they match
        const normalizedNew = normalizeTimeValue(newValue)
        const normalizedOriginal = normalizeTimeValue(originalValue as string)
        
        console.log(`🔍 Comparing values:`, {
          fieldId,
          originalValue,
          originalValueType: typeof originalValue,
          newValue,
          newValueType: typeof newValue,
          normalizedOriginal,
          normalizedNew,
          valuesMatch: normalizedNew === normalizedOriginal
        })
        
        if (normalizedNew === normalizedOriginal) {
          // Values match - remove the field from edits
          const { [fieldId]: removed, ...rest } = prev
          newFieldEdits = rest
          console.log(`🗑️ Removing field edit (values match):`, {
            fieldId,
            removedValue: removed,
            newFieldEdits
          })
        } else {
          // Values differ - add or update the field edit
          newFieldEdits = {
            ...prev,
            [fieldId]: newValue
          }
          console.log(`📝 Adding/updating field edit:`, {
            fieldId,
            originalValue,
            newValue,
            normalizedOriginal,
            normalizedNew,
            newFieldEdits
          })
        }
      }
      return newFieldEdits
    })
  }

  const confirmRejection = () => {
    setShowReasonDialog(true)
  }

  const submitRejection = async () => {
    if (!timecard || !rejectionReason.trim()) return

    setLoadingRejection(true)
    try {
      const hasEdits = Object.keys(fieldEdits).length > 0
      const rejectedFields = Object.keys(fieldEdits) // Fields that were edited are the rejected fields

      if (hasEdits) {
        console.log('🔧 Rejection with edits:', {
          timecardId: timecard.id,
          fieldEdits,
          rejectedFields,
          rejectionReason: rejectionReason.trim()
        })

        // Apply edits and reject the timecard
        const response = await fetch('/api/timecards/edit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timecardId: timecard.id,
            updates: {
              ...fieldEdits,
              status: 'rejected' // Set status to rejected when editing during rejection
            },
            editComment: rejectionReason.trim(),
            returnToDraft: false, // Don't return to draft, we want to reject
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Edit API error:', errorData)
          throw new Error(errorData.error || 'Failed to edit and reject timecard')
        }

        const result = await response.json()
        console.log('✅ Edit API success:', result)
      } else {
        console.log('🔧 Rejection without edits:', {
          timecardId: timecard.id,
          rejectionReason: rejectionReason.trim(),
          rejectedFields
        })

        // Standard rejection without edits
        const response = await fetch('/api/timecards/reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timecardId: timecard.id,
            comments: rejectionReason.trim(),
            rejectedFields: rejectedFields,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Reject API error:', errorData)
          throw new Error(errorData.error || 'Failed to reject timecard')
        }

        const result = await response.json()
        console.log('✅ Reject API success:', result)
      }

      // Reset rejection state and refresh data
      exitRejectionMode()
      setShowReasonDialog(false)
      setRejectionReason("")
      
      await fetchTimecard()
      // Trigger audit trail refresh
      setAuditRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error rejecting timecard:', error)
      setError(error instanceof Error ? error.message : 'Failed to reject timecard')
    } finally {
      setLoadingRejection(false)
    }
  }

  const closeReasonDialog = () => {
    setShowReasonDialog(false)
    setRejectionReason("")
  }

  // Field mapping for rejection display names
  const getFieldDisplayName = (fieldId: string) => {
    const fieldMap: Record<string, string> = {
      'total_hours': 'Total Hours',
      'total_break_duration': 'Total Break Time',
      'pay_rate': 'Pay Rate',
      'total_pay': 'Total Pay',
      'check_in_time': 'Check In',
      'break_start_time': 'Break Start',
      'break_end_time': 'Break End',
      'check_out_time': 'Check Out'
    }
    
    // Handle day-specific fields
    if (fieldId.includes('_day_')) {
      const parts = fieldId.split('_day_')
      const baseField = parts[0]
      const dayIndex = parseInt(parts[1])
      
      if (!isNaN(dayIndex) && timecard?.daily_entries && timecard.daily_entries[dayIndex]) {
        const entry = timecard.daily_entries[dayIndex]
        const date = new Date(entry.work_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
        return `${date} - ${fieldMap[baseField] || baseField}`
      }
      
      // Fallback if we can't get the date
      return `${fieldMap[baseField] || baseField} (Day ${dayIndex + 1})`
    }
    
    return fieldMap[fieldId] || fieldId
  }

  // Calculate timecard values in real-time
  const calculateValues = async (timecardData: Partial<Timecard>) => {
    if (!timecard) return

    try {
      const calculationEngine = createTimecardCalculationEngine(supabase)
      const fullTimecardData = {
        ...timecard,
        ...timecardData
      }
      
      const result = await calculationEngine.calculateTimecard(fullTimecardData)
      
      if (result.is_valid) {
        setCalculatedValues({
          total_hours: result.total_hours,
          break_duration: result.break_duration,
          total_pay: result.total_pay
        })
      }
    } catch (error) {
      console.error('Error calculating timecard values:', error)
    }
  }

  // Admin notes functions
  const saveAdminNotes = async () => {
    if (!timecard) return
    
    setSavingAdminNotes(true)
    try {
      const response = await fetch('/api/timecards/admin-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecard.id,
          adminNotes: adminNotesValue.trim()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save admin notes')
      }

      // Update the timecard object
      if (timecard) {
        timecard.admin_notes = adminNotesValue.trim()
      }
      setIsEditingAdminNotes(false)
    } catch (error) {
      console.error('Error saving admin notes:', error)
      // Reset to original value on error
      setAdminNotesValue(timecard?.admin_notes || '')
    } finally {
      setSavingAdminNotes(false)
    }
  }

  const cancelAdminNotesEdit = () => {
    setAdminNotesValue(timecard?.admin_notes || '')
    setIsEditingAdminNotes(false)
  }

  const startEditing = () => {
    if (!timecard) return
    
    setIsEditing(true)
    setEditedTimecard({
      check_in_time: timecard.check_in_time,
      check_out_time: timecard.check_out_time,
      break_start_time: timecard.break_start_time,
      break_end_time: timecard.break_end_time
    })
    setCalculatedValues({
      total_hours: timecard.total_hours || 0,
      break_duration: timecard.break_duration || 0,
      total_pay: timecard.total_pay || 0
    })
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setIsEditAndReturn(false)
    setEditedTimecard({})
    if (timecard) {
      setCalculatedValues({
        total_hours: timecard.total_hours || 0,
        break_duration: timecard.break_duration || 0,
        total_pay: timecard.total_pay || 0
      })
    }
  }

  const handleTimeChange = (field: string, value: string) => {
    const utcValue = value ? datetimeLocalToUtc(value) : null
    
    const updatedTimecard = {
      ...editedTimecard,
      [field]: utcValue
    }
    setEditedTimecard(updatedTimecard)
    
    calculateValues(updatedTimecard)
  }

  const saveChanges = () => {
    if (isEditAndReturn) {
      setShowEditReturnDialog(true)
    } else {
      setShowEditReasonDialog(true)
    }
  }

  const saveChangesWithReason = async () => {
    if (!timecard || !editReason.trim()) return
    
    setEditLoading(true)
    try {
      const response = await fetch('/api/timecards/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecard.id,
          updates: {
            ...editedTimecard,
            total_hours: calculatedValues.total_hours,
            break_duration: calculatedValues.break_duration,
            total_pay: calculatedValues.total_pay,
            manually_edited: true
          },
          adminNote: editReason.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save changes')
      }

      await fetchTimecard()
      setIsEditing(false)
      setEditedTimecard({})
      setShowEditReasonDialog(false)
      setEditReason("")
      // Trigger audit trail refresh
      setAuditRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error saving timecard changes:', error)
      setError(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditAndReturn = async () => {
    if (!timecard || !comments.trim()) return
    
    setEditLoading(true)
    try {
      const response = await fetch('/api/timecards/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecard.id,
          updates: {
            ...editedTimecard,
            total_hours: calculatedValues.total_hours,
            break_duration: calculatedValues.break_duration,
            total_pay: calculatedValues.total_pay,
            status: 'draft'
          },
          adminNote: comments.trim(),
          returnToDraft: true
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to return timecard to draft')
      }

      await fetchTimecard()
      setIsEditing(false)
      setIsEditAndReturn(false)
      setEditedTimecard({})
      setShowEditReturnDialog(false)
      setComments("")
      // Trigger audit trail refresh
      setAuditRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error returning timecard to draft:', error)
      setError(error instanceof Error ? error.message : 'Failed to return timecard to draft')
    } finally {
      setEditLoading(false)
    }
  }

  const handleAdminEditDraft = async () => {
    if (!timecard || !comments.trim()) return
    
    setActionLoading('admin-edit')
    try {
      const editUrl = `/timecards/${timecard.id}/edit?admin=true&reason=${encodeURIComponent(comments.trim())}`
      router.push(editUrl)
    } catch (error) {
      console.error('Error navigating to edit:', error)
      setError(error instanceof Error ? error.message : 'Failed to navigate to edit page')
    } finally {
      setActionLoading(null)
      setShowAdminEditDialog(false)
      setComments("")
    }
  }

  // Helper function to safely format dates
  const formatDate = (dateValue: string | null | undefined, formatString: string, fallback: string = "Date not available") => {
    if (!dateValue) return fallback
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return fallback
      return format(date, formatString)
    } catch (error) {
      console.error('Date formatting error:', error)
      return fallback
    }
  }

  // Check if user can approve timecards
  const canApprove = userProfile ? canApproveTimecardsWithSettings(
    userProfile.role,
    globalSettings
  ) : false

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500 dark:bg-gray-400"
      case "submitted":
        return "bg-blue-500 dark:bg-blue-400"
      case "approved":
        return "bg-green-500 dark:bg-green-400"
      case "rejected":
        return "bg-red-500 dark:bg-red-400"
      default:
        return "bg-gray-500 dark:bg-gray-400"
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

  const getStatusBadgeColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Error Loading Timecard</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button variant="outline" asChild>
              <Link href={getBackUrl()}>Back to Timecards</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!timecard) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Timecard Not Found</h3>
              <p className="text-muted-foreground mt-2">The requested timecard could not be found.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href={getBackUrl()}>Back to Timecards</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - matching project detail page style */}
      <div className="fixed top-0 md:top-[69px] left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                asChild
                className="gap-2 hover:bg-muted transition-colors"
              >
                <Link href={getBackUrl()}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {(timecard as any).user_name || "Unknown User"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {(timecard as any).project_name || "Unknown Project"} • {formatDate(timecard.date, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {timecard.manually_edited && timecard.status === "draft" && (
                <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Admin Flagged
                </Badge>
              )}
              {timecard.manually_edited && timecard.status !== "draft" && (
                <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Manually Edited
                </Badge>
              )}
              <Badge 
                variant="outline"
                className={getStatusBadgeColor(timecard.status)}
              >
                {getStatusText(timecard.status)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - with top padding to account for sticky header */}
      <div className="container mx-auto px-4 pt-[100px] pb-6 space-y-6">
        {/* Unified Timecard Display - handles both single-day and multi-day, editing and viewing */}
        <MultiDayTimecardDetail 
          timecard={timecard}
          isEditing={isEditing}
          editedTimecard={editedTimecard}
          calculatedValues={calculatedValues}
          onTimeChange={handleTimeChange}
          globalSettings={globalSettings}
          isRejectionMode={isRejectionMode}
          fieldEdits={fieldEdits}
          onFieldEdit={handleFieldEdit}
          showRejectedFields={timecard.status === 'rejected'}
          actionButtons={
            /* Action Buttons - Right to Left: Approve, Reject, Edit & Return */
            isEditing ? (
              <>
                <Button 
                  onClick={cancelEditing}
                  size="sm"
                  variant="outline"
                  disabled={editLoading}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Cancel
                </Button>
                <Button 
                  onClick={saveChanges}
                  size="sm"
                  disabled={editLoading}
                  className="gap-2"
                >
                  {editLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </Button>
              </>
            ) : isRejectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitRejectionMode}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={confirmRejection}
                  className="bg-red-600 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-900 text-white"
                >
                  {Object.keys(fieldEdits).length > 0 ? "Apply Changes & Return" : "Reject Without Changes"}
                </Button>
              </>
            ) : (
              <>
                {/* Submitted timecard actions */}
                {timecard.status === "submitted" && canApprove && (
                  <>
                    <Button 
                      onClick={() => {
                        setIsEditAndReturn(true)
                        startEditing()
                      }}
                      disabled={actionLoading !== null}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit & Return</span>
                      <span className="sm:hidden">Edit</span>
                    </Button>
                    
                    <Button 
                      onClick={enterRejectionMode}
                      disabled={actionLoading !== null}
                      size="sm"
                      variant="outline"
                      className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-white dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 hover:border-red-100 dark:hover:border-red-800 gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Reject
                    </Button>
                    
                    <Button 
                      onClick={() => setShowApproveDialog(true)}
                      disabled={actionLoading !== null}
                      size="sm"
                      className="bg-green-600/20 border border-green-600 text-green-400 hover:bg-green-600/30 hover:border-green-700 gap-2"
                    >
                      {actionLoading === 'approve' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </Button>
                  </>
                )}

                {/* Edit Controls for Draft */}
                {(timecard.status === "draft" && (userProfile?.id === timecard.user_id || canApprove)) && (
                  <Button 
                    onClick={startEditing}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Times</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                )}
              </>
            )
          }
        />

        {/* Change Log */}
        <AuditTrailSection 
          timecardId={timecard.id}
          className="w-full"
          refreshTrigger={auditRefreshTrigger}
        />

        {/* Admin Notes Section - Only visible to authorized users */}
        {canApprove && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingAdminNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={adminNotesValue}
                    onChange={(e) => setAdminNotesValue(e.target.value)}
                    placeholder="Enter admin notes..."
                    rows={4}
                    disabled={savingAdminNotes}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={saveAdminNotes} 
                      size="sm" 
                      className="gap-2"
                      disabled={savingAdminNotes}
                    >
                      <Save className="h-4 w-4" />
                      {savingAdminNotes ? 'Saving...' : 'Save'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={cancelAdminNotesEdit}
                      size="sm"
                      className="gap-2"
                      disabled={savingAdminNotes}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="min-h-[100px] p-3 border rounded-md bg-muted/50">
                    {timecard.admin_notes ? (
                      <span className="whitespace-pre-wrap">{timecard.admin_notes}</span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        No admin notes provided. Click edit to add notes.
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingAdminNotes(true)}
                    size="sm"
                    disabled={savingAdminNotes}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Notes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Information */}
        {(timecard.approved_at || timecard.submitted_at) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Status Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timecard.submitted_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                  <p>{formatDate(timecard.submitted_at, "MMMM d, yyyy 'at' h:mm a")}</p>
                </div>
              )}
              {timecard.approved_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {timecard.status === "approved" ? "Approved" : "Processed"}
                  </label>
                  <p>{formatDate(timecard.approved_at, "MMMM d, yyyy 'at' h:mm a")}</p>
                  {timecard.approved_by && (
                    <p className="text-sm text-muted-foreground">
                      by User ID: {timecard.approved_by}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Timecard</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this timecard for {(timecard as any).user_name}?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Comments (optional)</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments about this approval..."
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowApproveDialog(false)
                  setComments("")
                }}
                disabled={actionLoading === 'approve'}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={actionLoading === 'approve'}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading === 'approve' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Approve Timecard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Timecard</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this timecard. The user will be notified and can resubmit.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rejection Reason *</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why this timecard is being rejected..."
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRejectDialog(false)
                  setComments("")
                }}
                disabled={actionLoading === 'reject'}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleReject}
                disabled={actionLoading === 'reject' || !comments.trim()}
                variant="destructive"
              >
                {actionLoading === 'reject' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Reject Timecard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Draft Dialog */}
        <Dialog open={showAdminEditDialog} onOpenChange={setShowAdminEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Draft Timecard</DialogTitle>
              <DialogDescription>
                You are about to edit a draft timecard that belongs to {(timecard as any).user_name}. 
                Your edits will be flagged for the user to review before they can submit.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Important:</p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      The user will be notified of your edits and must review them before submitting their timecard.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Reason for Edit *</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why you need to edit this draft timecard..."
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAdminEditDialog(false)
                  setComments("")
                }}
                disabled={actionLoading === 'admin-edit'}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAdminEditDraft}
                disabled={actionLoading === 'admin-edit' || !comments.trim()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {actionLoading === 'admin-edit' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Proceed to Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit & Return Dialog */}
        <Dialog open={showEditReturnDialog} onOpenChange={setShowEditReturnDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Changes & Return to Draft</DialogTitle>
              <DialogDescription>
                Your changes will be saved and the timecard will be returned to draft status. Please provide a reason for the user.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason for Changes *</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain the changes made and why (e.g., 'Corrected check-in time based on security logs', 'Added missing break period', etc.)..."
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditReturnDialog(false)
                  setComments("")
                }}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditAndReturn}
                disabled={editLoading || !comments.trim()}
              >
                {editLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save & Return to Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Reason Dialog */}
        <Dialog open={showEditReasonDialog} onOpenChange={setShowEditReasonDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Timecard Changes</DialogTitle>
              <DialogDescription>
                Please provide a reason for these changes. This will help with audit tracking and transparency.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason for Changes *</label>
                <Textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Explain why these changes were made (e.g., 'Corrected check-in time', 'Added missing break', etc.)..."
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditReasonDialog(false)
                  setEditReason("")
                }}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveChangesWithReason}
                disabled={editLoading || !editReason.trim()}
              >
                {editLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Rejection Reason Dialog */}
        <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className={Object.keys(fieldEdits).length > 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}>
                {Object.keys(fieldEdits).length > 0 ? 'Return Timecard with Changes' : 'Reject Timecard'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {Object.keys(fieldEdits).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Modified fields:</Label>
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(fieldEdits).map((fieldId, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs font-medium"
                        >
                          {getFieldDisplayName(fieldId)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Show changes made */}
              {Object.keys(fieldEdits).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Changes made:</Label>
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="space-y-2">
                      {Object.entries(fieldEdits).map(([fieldId, newValue]) => {
                        const originalValue = getOriginalValue(fieldId)

                        const formatTime = (timeString: string | null) => {
                          if (!timeString) return "Not Recorded"
                          
                          try {
                            // Handle both full datetime and simple time formats
                            let date: Date;
                            
                            if (timeString.includes('T')) {
                              // Full datetime string
                              date = new Date(timeString)
                            } else if (timeString.includes(':')) {
                              // Simple time format (HH:MM:SS) - combine with today's date
                              const today = new Date().toISOString().split('T')[0]
                              date = new Date(`${today}T${timeString}`)
                            } else {
                              return "Not Recorded"
                            }
                            
                            if (isNaN(date.getTime())) return "Not Recorded"
                            
                            return date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          } catch {
                            return "Not Recorded"
                          }
                        }

                        return (
                          <div key={fieldId} className="text-sm">
                            <span className="font-medium text-blue-700 dark:text-blue-300">
                              {getFieldDisplayName(fieldId)}:
                            </span>
                            <span className="ml-2 text-muted-foreground line-through">
                              {formatTime(originalValue as string)}
                            </span>
                            <span className="mx-2 text-blue-600 dark:text-blue-400">→</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {formatTime(newValue)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                  {Object.keys(fieldEdits).length > 0 ? 'Explanation of changes' : 'Reason for rejection'} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  placeholder={Object.keys(fieldEdits).length > 0
                    ? "Explain the corrections made and any remaining issues..."
                    : "Please explain the issues with this timecard..."
                  }
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
                {!rejectionReason.trim() && (
                  <p className="text-xs text-red-500 mt-1">
                    {Object.keys(fieldEdits).length > 0
                      ? 'An explanation is required when making changes'
                      : 'A reason is required when rejecting a timecard'
                    }
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeReasonDialog}
                disabled={loadingRejection}
              >
                Cancel
              </Button>
              <Button
                onClick={submitRejection}
                disabled={!rejectionReason.trim() || loadingRejection}
                className="bg-red-600 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-900 text-white"
              >
                {loadingRejection ? 'Processing...' : Object.keys(fieldEdits).length > 0 ? 'Apply Changes & Return' : 'Reject Timecard'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}