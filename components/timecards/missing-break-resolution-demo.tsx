"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TimecardList } from "./timecard-list"
import type { Timecard } from "@/lib/types"

// Mock timecard data for demonstration
const mockTimecards: Timecard[] = [
  {
    id: "1",
    user_id: "user1",
    project_id: "project1",
    date: "2024-01-15",
    check_in_time: "2024-01-15T08:00:00Z",
    check_out_time: "2024-01-15T17:30:00Z",
    break_start_time: null, // Missing break data
    break_end_time: null,
    total_hours: 9.5, // >6 hours, should trigger missing break resolution
    break_duration: 0,
    pay_rate: 25,
    total_pay: 237.5,
    status: "draft",
    manually_edited: false,
    created_at: "2024-01-15T08:00:00Z",
    updated_at: "2024-01-15T08:00:00Z",
    projects: {
      name: "Demo Project"
    }
  },
  {
    id: "2",
    user_id: "user1",
    project_id: "project1",
    date: "2024-01-16",
    check_in_time: "2024-01-16T09:00:00Z",
    check_out_time: "2024-01-16T16:00:00Z",
    break_start_time: "2024-01-16T12:00:00Z", // Has break data
    break_end_time: "2024-01-16T12:30:00Z",
    total_hours: 6.5,
    break_duration: 30,
    pay_rate: 25,
    total_pay: 162.5,
    status: "draft",
    manually_edited: false,
    created_at: "2024-01-16T09:00:00Z",
    updated_at: "2024-01-16T09:00:00Z",
    projects: {
      name: "Demo Project"
    }
  },
  {
    id: "3",
    user_id: "user1",
    project_id: "project1",
    date: "2024-01-17",
    check_in_time: "2024-01-17T08:00:00Z",
    check_out_time: "2024-01-17T16:30:00Z",
    break_start_time: null, // Missing break data
    break_end_time: null,
    total_hours: 8.5, // >6 hours, should trigger missing break resolution
    break_duration: 0,
    pay_rate: 25,
    total_pay: 212.5,
    status: "draft",
    manually_edited: false,
    created_at: "2024-01-17T08:00:00Z",
    updated_at: "2024-01-17T08:00:00Z",
    projects: {
      name: "Demo Project"
    }
  }
]

export function MissingBreakResolutionDemo() {
  const [timecards, setTimecards] = useState<Timecard[]>(mockTimecards)

  const handleUpdate = () => {
    // In a real app, this would refetch data from the server
    console.log("Timecards updated")
  }

  const resetDemo = () => {
    setTimecards(mockTimecards)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Missing Break Resolution System Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              This demo shows the missing break resolution system in action. The system automatically detects:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Shifts longer than 6 hours without break information</li>
              <li>Blocks timecard submission until breaks are resolved</li>
              <li>Provides options to "Add Break" or "I Did Not Take a Break"</li>
              <li>Supports both individual and bulk submission workflows</li>
            </ul>
            <p className="font-medium text-foreground">
              Try submitting individual timecards or using "Submit All" to see the resolution modal.
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={resetDemo}>
              Reset Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <TimecardList 
        timecards={timecards}
        onUpdate={handleUpdate}
        enableBulkSubmit={true}
      />
    </div>
  )
}