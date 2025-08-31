"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, DollarSign, FileText, AlertCircle } from "lucide-react"
import type { Timecard, TimecardSummary } from "@/lib/types"
import { TimecardList } from "@/components/timecards/timecard-list"
import { SupervisorApprovalQueue } from "@/components/timecards/supervisor-approval-queue"
// Temporarily disabled during auth system overhaul
// import { useAuth } from "@/lib/auth"

export default function TimecardsPage() {
  // Temporarily disabled during auth system overhaul
  // const { user, userProfile } = useAuth()
  const user = { id: 'temp-user' } // Temporary mock
  const userProfile = { role: 'admin' } // Temporary mock
  const [timecards, setTimecards] = useState<Timecard[]>([])
  const [pendingTimecards, setPendingTimecards] = useState<Timecard[]>([])
  const [summary, setSummary] = useState<TimecardSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "in_house"
  const isSupervisor = userProfile?.role === "supervisor" || userProfile?.role === "talent_logistics_coordinator"

  useEffect(() => {
    if (user) {
      fetchTimecards()
      if (isSupervisor || isAdmin) {
        fetchPendingTimecards()
      }
      if (isAdmin) {
        fetchTimecardSummary()
      }
    }
  }, [user, statusFilter])

  const fetchTimecards = async () => {
    try {
      let query = supabase
        .from("timecards")
        .select(`
          *,
          profiles:user_id (
            full_name
          ),
          projects:project_id (
            name
          )
        `)
        .order("date", { ascending: false })

      // Filter by user for non-admin roles
      if (!isAdmin) {
        query = query.eq("user_id", user?.id)
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setTimecards(data || [])
    } catch (error) {
      console.error("Error fetching timecards:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingTimecards = async () => {
    try {
      const { data, error } = await supabase
        .from("timecards")
        .select(`
          *,
          profiles:user_id (
            full_name
          ),
          projects:project_id (
            name
          )
        `)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: true })

      if (error) throw error
      setPendingTimecards(data || [])
    } catch (error) {
      console.error("Error fetching pending timecards:", error)
    }
  }

  const fetchTimecardSummary = async () => {
    try {
      const { data, error } = await supabase
        .from("timecard_summary")
        .select("*")
        .order("total_pay", { ascending: false })

      if (error) throw error
      setSummary(data || [])
    } catch (error) {
      console.error("Error fetching timecard summary:", error)
    }
  }

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
        return "Pending"
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
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timecards</h1>
        {!isAdmin && <Button onClick={() => (window.location.href = "/timecards/new")}>Submit Timecard</Button>}
      </div>

      <Tabs defaultValue="my-timecards" className="space-y-4">
        <TabsList className="bg-transparent border border-border rounded-lg p-1 gap-1">
          <TabsTrigger 
            value="my-timecards"
            className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent"
          >
            {isAdmin ? "All Timecards" : "My Timecards"}
          </TabsTrigger>
          {(isSupervisor || isAdmin) && (
            <TabsTrigger 
              value="approvals"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent"
            >
              Approvals
              {pendingTimecards.length > 0 && (
                <Badge className="ml-2 bg-red-500 dark:bg-red-400 text-white">{pendingTimecards.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger 
              value="summary"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent"
            >
              Summary
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-timecards" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <TimecardList timecards={timecards} onUpdate={fetchTimecards} showUserColumn={isAdmin} />
        </TabsContent>

        {(isSupervisor || isAdmin) && (
          <TabsContent value="approvals">
            <SupervisorApprovalQueue
              timecards={pendingTimecards}
              onUpdate={() => {
                fetchPendingTimecards()
                fetchTimecards()
              }}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Timecards</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{timecards.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTimecards.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {timecards.reduce((sum, tc) => sum + tc.total_hours, 0).toFixed(1)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pay</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${timecards.reduce((sum, tc) => sum + tc.total_pay, 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Payroll Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.map((item) => (
                    <div key={item.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.user_name}</p>
                        <p className="text-sm text-muted-foreground">{item.project_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.timecard_count} timecards • {item.total_hours} hours
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${item.total_pay.toFixed(2)}</p>
                        {item.pending_count > 0 && (
                          <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                            {item.pending_count} pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
