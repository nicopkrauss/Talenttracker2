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
import { Clock, Calendar, AlertTriangle, ArrowLeft, Check, X, Edit, Loader2, Save, RotateCcw } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { canApproveTimecardsWithSettings } from "@/lib/role-utils"
import { createTimecardCalculationEngine } from "@/lib/timecard-calculation-engine"
import { utcToDatetimeLocal, datetimeLocalToUtc } from "@/lib/timezone-utils"
import { MultiDayTimecardDetail } from "@/components/timecards/multi-day-timecard-detail"

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
  const [comments, setComments] = useState("")
  const [editReason, setEditReason] = useState("")
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

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
    } catch (error) {
      console.error('Error rejecting timecard:', error)
      setError(error instanceof Error ? error.message : 'Failed to reject timecard')
    } finally {
      setActionLoading(null)
    }
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
              <Link href="/timecards">Back to Timecards</Link>
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
              <Link href="/timecards">Back to Timecards</Link>
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
                <Link href="/timecards">
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
                      Edit & Return
                    </Button>
                    
                    <Button 
                      onClick={() => setShowRejectDialog(true)}
                      disabled={actionLoading !== null}
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                    >
                      {actionLoading === 'reject' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Reject
                    </Button>
                    
                    <Button 
                      onClick={() => setShowApproveDialog(true)}
                      disabled={actionLoading !== null}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
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
                    Edit Times
                  </Button>
                )}
              </>
            )
          }
        />

        {/* Approval Information */}
        {(timecard.approved_at || timecard.submitted_at) && (
          <Card>
            <CardHeader>
              <CardTitle>Status Information</CardTitle>
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
      </div>
    </div>
  )
}