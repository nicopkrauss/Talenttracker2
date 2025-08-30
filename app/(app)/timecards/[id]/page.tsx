"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Calendar, User, AlertTriangle } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import Link from "next/link"

export default function TimecardDetailPage() {
  const params = useParams()
  const [timecard, setTimecard] = useState<Timecard | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (params.id) {
      fetchTimecard()
    }
  }, [params.id])

  const fetchTimecard = async () => {
    try {
      const { data, error } = await supabase
        .from("timecards")
        .select(`
          *,
          users:user_id (
            first_name,
            last_name,
            email
          ),
          projects:project_id (
            name,
            status
          ),
          approver:approved_by (
            first_name,
            last_name
          )
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error
      setTimecard(data)
    } catch (error) {
      console.error("Error fetching timecard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500"
      case "submitted":
        return "bg-blue-500"
      case "approved":
        return "bg-green-500"
      case "rejected":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft"
      case "submitted":
        return "Pending Approval"
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!timecard) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Timecard not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timecard Details</h1>
          <p className="text-gray-600">{format(new Date(timecard.date), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center space-x-2">
          {timecard.manually_edited && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Manually Edited
            </Badge>
          )}
          <Badge className={`${getStatusColor(timecard.status)} text-white`}>{getStatusText(timecard.status)}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employee Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timecard.users && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p>
                    {timecard.users.first_name} {timecard.users.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p>{timecard.users.email}</p>
                </div>
              </>
            )}
            {timecard.projects && (
              <div>
                <label className="text-sm font-medium text-gray-600">Project</label>
                <p>{timecard.projects.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Time Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Total Hours</label>
              <p className="text-2xl font-bold">{timecard.total_hours.toFixed(1)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Break Duration</label>
              <p>{Math.round(timecard.break_duration)} minutes</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Pay Rate</label>
              <p>${timecard.pay_rate.toFixed(2)}/hour</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Total Pay</label>
              <p className="text-2xl font-bold text-green-600">${timecard.total_pay.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Time Details */}
        {timecard.check_in_time && timecard.check_out_time && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Time Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-600">Check In</label>
                  <p className="text-lg font-medium">{format(new Date(timecard.check_in_time), "h:mm:ss a")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Check Out</label>
                  <p className="text-lg font-medium">{format(new Date(timecard.check_out_time), "h:mm:ss a")}</p>
                </div>
              </div>

              {timecard.break_start_time && timecard.break_end_time && (
                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Break Start</label>
                    <p className="text-lg font-medium">{format(new Date(timecard.break_start_time), "h:mm:ss a")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Break End</label>
                    <p className="text-lg font-medium">{format(new Date(timecard.break_end_time), "h:mm:ss a")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        {timecard.supervisor_comments && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Supervisor Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{timecard.supervisor_comments}</p>
            </CardContent>
          </Card>
        )}

        {/* Approval Information */}
        {(timecard.approved_at || timecard.submitted_at) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Status Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timecard.submitted_at && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Submitted</label>
                  <p>{format(new Date(timecard.submitted_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                </div>
              )}
              {timecard.approved_at && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {timecard.status === "approved" ? "Approved" : "Processed"}
                  </label>
                  <p>{format(new Date(timecard.approved_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                  {timecard.approver && (
                    <p className="text-sm text-gray-500">
                      by {timecard.approver.first_name} {timecard.approver.last_name}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <Button variant="outline" asChild>
          <Link href="/timecards">Back to Timecards</Link>
        </Button>
        {timecard.status === "draft" && (
          <Button asChild>
            <Link href={`/timecards/${timecard.id}/edit`}>Edit Timecard</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
