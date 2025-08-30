"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, DollarSign, Edit, AlertTriangle } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import Link from "next/link"

interface TimecardListProps {
  timecards: Timecard[]
  onUpdate: () => void
  showUserColumn?: boolean
}

export function TimecardList({ timecards, onUpdate, showUserColumn = false }: TimecardListProps) {
  const [submitting, setSubmitting] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const submitTimecard = async (timecardId: string) => {
    setSubmitting(timecardId)
    try {
      const { error } = await supabase
        .from("timecards")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", timecardId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error("Error submitting timecard:", error)
    } finally {
      setSubmitting(null)
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
        return "Pending"
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      default:
        return status
    }
  }

  if (timecards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No timecards found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {timecards.map((timecard) => (
        <Card key={timecard.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <CardTitle className="text-lg">{format(new Date(timecard.date), "EEEE, MMMM d, yyyy")}</CardTitle>
                  {showUserColumn && timecard.profiles && (
                    <p className="text-sm text-gray-600">
                      {timecard.profiles.full_name}
                    </p>
                  )}
                  {timecard.projects && <p className="text-sm text-gray-600">{timecard.projects.name}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {timecard.manually_edited && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Edited
                  </Badge>
                )}
                <Badge className={`${getStatusColor(timecard.status)} text-white`}>
                  {getStatusText(timecard.status)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Hours Worked</p>
                  <p className="font-medium">{timecard.total_hours.toFixed(1)} hours</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Break Duration</p>
                  <p className="font-medium">{Math.round(timecard.break_duration)} minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Total Pay</p>
                  <p className="font-medium">${timecard.total_pay.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {timecard.check_in_time && timecard.check_out_time && (
              <div className="text-sm text-gray-600">
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

            {timecard.supervisor_comments && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Supervisor Comments:</p>
                <p className="text-sm text-gray-600">{timecard.supervisor_comments}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                {timecard.status === "draft" && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/timecards/${timecard.id}/edit`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => submitTimecard(timecard.id)} disabled={submitting === timecard.id}>
                      {submitting === timecard.id ? "Submitting..." : "Submit"}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/timecards/${timecard.id}`}>View Details</Link>
                </Button>
              </div>
              {timecard.submitted_at && (
                <p className="text-xs text-gray-500">
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
