"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Phone, Mail, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TalentProfile } from "@/lib/types"
import Link from "next/link"
import { CSVImportDialog } from "@/components/talent/csv-import-dialog"

export default function TalentPage() {
  const [talent, setTalent] = useState<TalentProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
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
        .select("*")
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
      person.rep_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false

    return matchesSearch
  })

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
        <div className="flex gap-2">
          <CSVImportDialog onImportComplete={fetchTalent} />
          <Button asChild>
            <Link href="/talent/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Talent
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search talent by name, representative name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Talent Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTalent.map((person) => (
          <Card key={person.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {person.first_name} {person.last_name}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Representative</p>
                <p className="text-sm font-medium truncate">
                  {person.rep_name || 'No representative assigned'}
                </p>
                {person.rep_email && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {person.rep_email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {person.rep_phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`tel:${person.rep_phone}`)}
                      className="flex-1 text-xs"
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      Call Rep
                    </Button>
                  )}
                  {person.rep_email && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`mailto:${person.rep_email}`)}
                      className="flex-1 text-xs"
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Email Rep
                    </Button>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild className="text-xs">
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