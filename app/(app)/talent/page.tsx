"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, MapPin, Phone, AlertTriangle, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TalentProfile } from "@/lib/types"
import Link from "next/link"

export default function TalentPage() {
  const [talent, setTalent] = useState<TalentProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchTalent()
  }, [])

  const fetchTalent = async () => {
    try {
      const { data, error } = await supabase
        .from("talent")
        .select(`
          *,
          talent_project_assignments (
            project_id,
            status,
            projects (
              name,
              status
            )
          )
        `)
        .order("first_name")

      if (error) throw error
      setTalent(data || [])
    } catch (error) {
      console.error("Error fetching talent:", error)
      // Better error logging for Supabase errors
      if (error && typeof error === 'object') {
        console.error("Supabase error details:", JSON.stringify(error, null, 2))
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredTalent = talent.filter((person) => {
    const fullName = `${person.first_name} ${person.last_name}`
    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.rep_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false

    const matchesProject = projectFilter === "all" || 
      person.talent_project_assignments?.some(assignment => 
        assignment.project_id === projectFilter && assignment.status === 'active'
      )

    return matchesSearch && matchesProject
  })

  const getCurrentLocation = (person: TalentProfile) => {
    const latestStatus = person.talent_status?.[0]
    return latestStatus?.project_locations?.name || "Unknown"
  }

  const getEscortName = (person: TalentProfile) => {
    const assignment = person.talent_project_assignments?.[0]
    return assignment?.escort_id ? "Escort assigned" : "No escort assigned"
  }

  const getProjectName = (person: TalentProfile) => {
    const assignment = person.talent_project_assignments?.find(a => a.status === 'active')
    return assignment?.projects?.name || "No project assigned"
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
        <h1 className="text-2xl font-bold">Talent Management</h1>
        <Button asChild>
          <Link href="/talent/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Talent
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search talent by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {/* Add project options dynamically */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Talent Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTalent.map((person) => (
          <Card key={person.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {person.first_name} {person.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{person.rep_email || 'No email'}</p>
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2" />
                {getCurrentLocation(person)}
              </div>

              <div className="text-sm">
                <span className="font-medium">Escort: </span>
                {getEscortName(person)}
              </div>

              <div className="text-sm">
                <span className="font-medium">Project: </span>
                {getProjectName(person)}
              </div>

              <div className="flex items-center justify-between pt-2">
                {person.rep_phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${person.rep_phone}`)}
                    className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call Rep
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/talent/${person.id}`}>View Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTalent.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No talent found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
