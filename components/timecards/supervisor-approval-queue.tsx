"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, Calendar, DollarSign, AlertTriangle, Check, X } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"

interface SupervisorApprovalQueueProps {
  timecards: Timecard[]
  onUpdate: () => void
}

export function SupervisorApprovalQueue({ timecards, onUpdate }: SupervisorApprovalQueueProps) {
  const [selectedTimecards, setSelectedTimecards] = useState<string[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const handleTimecardSelection = (timecardId: string, checked: boolean) => {
    if (checked) {
      setSelectedTimecards([...selectedTimecards, timecardId])
    } else {
      setSelectedTimecards(selectedTimecards.filter((id) => id !== timecardId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTimecards(timecards.map((tc) => tc.id))
    } else {
      setSelectedTimecards([])
    }
  }

  const approveTimecard = async (timecardId: string) => {
    setProcessing(timecardId)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("timecards")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          supervisor_comments: comments[timecardId] || null,
        })
        .eq("id", timecardId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error("Error approving timecard:", error)
    } finally {
      setProcessing(null)
    }
  }

  const rejectTimecard = async (timecardId: string) => {
    setProcessing(timecardId)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("timecards")
        .update({
          status: "rejected",
          supervisor_comments: comments[timecardId] || "Rejected by supervisor",
        })
        .eq("id", timecardId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error("Error rejecting timecard:", error)
    } finally {
      setProcessing(null)
    }
  }

  const bulkApprove = async () => {
    setProcessing("bulk")
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("timecards")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .in("id", selectedTimecards)

      if (error) throw error
      setSelectedTimecards([])
      onUpdate()
    } catch (error) {
      console.error("Error bulk approving timecards:", error)
    } finally {
      setProcessing(null)
    }
  }

  if (timecards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Check className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
          <p className="text-muted-foreground">No timecards pending approval.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox checked={selectedTimecards.length === timecards.length} onCheckedChange={handleSelectAll} />
              <span className="text-sm font-medium">
                {selectedTimecards.length} of {timecards.length} selected
              </span>
            </div>
            {selectedTimecards.length > 0 && (
              <Button
                onClick={bulkApprove}
                disabled={processing === "bulk"}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              >
                {processing === "bulk" ? "Approving..." : `Approve ${selectedTimecards.length} Timecards`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timecard List */}
      {timecards.map((timecard) => (
        <Card key={timecard.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedTimecards.includes(timecard.id)}
                  onCheckedChange={(checked) => handleTimecardSelection(timecard.id, checked as boolean)}
                />
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{format(new Date(timecard.date), "EEEE, MMMM d, yyyy")}</CardTitle>
                  {timecard.profiles && (
                    <p className="text-sm text-muted-foreground">
                      {timecard.profiles.full_name}
                    </p>
                  )}
                  {timecard.projects && <p className="text-sm text-muted-foreground">{timecard.projects.name}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {timecard.manually_edited && (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Manually Edited
                  </Badge>
                )}
                <Badge className="bg-blue-500 text-white dark:bg-blue-600 dark:text-blue-50">Pending Review</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Hours Worked</p>
                  <p className="font-medium">{timecard.total_hours.toFixed(1)} hours</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Break Duration</p>
                  <p className="font-medium">{Math.round(timecard.break_duration)} minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Pay</p>
                  <p className="font-medium">${timecard.total_pay.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {timecard.check_in_time && timecard.check_out_time && (
              <div className="text-sm text-muted-foreground">
                <p>
                  {format(new Date(timecard.check_in_time), "h:mm a")} -{" "}
                  {format(new Date(timecard.check_out_time), "h:mm a")}
                </p>
                {timecard.break_start_time && timecard.break_end_time && (
                  <p>
                    Break: {format(new Date(timecard.break_start_time), "h:mm a")} -{" "}
                    {format(new Date(timecard.break_end_time), "h:mm a")}
                  </p>
                )}
              </div>
            )}

            {timecard.manually_edited && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Manual Edit Flag</p>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  This timecard has been manually edited and requires supervisor review.
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">Supervisor Comments (Optional)</label>
              <Textarea
                placeholder="Add comments for this timecard..."
                value={comments[timecard.id] || ""}
                onChange={(e) => setComments({ ...comments, [timecard.id]: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rejectTimecard(timecard.id)}
                  disabled={processing === timecard.id}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
                >
                  <X className="w-4 h-4 mr-1" />
                  {processing === timecard.id ? "Processing..." : "Reject"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveTimecard(timecard.id)}
                  disabled={processing === timecard.id}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {processing === timecard.id ? "Processing..." : "Approve"}
                </Button>
              </div>
              {timecard.submitted_at && (
                <p className="text-xs text-muted-foreground">
                  Submitted {format(new Date(timecard.submitted_at), "MMM d, h:mm a")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
