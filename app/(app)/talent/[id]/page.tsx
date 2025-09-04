"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Phone, User, FileText } from "lucide-react"
import type { TalentProfile } from "@/lib/types"
import { TalentProfileForm } from "@/components/talent/talent-profile-form"
import { TalentProjectManager } from "@/components/talent/talent-project-manager"

export default function TalentProfilePage() {
  const params = useParams()
  const [talent, setTalent] = useState<TalentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (params.id) {
      fetchTalentProfile()
    }
  }, [params.id])

  const fetchTalentProfile = async () => {
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
              status,
              start_date,
              end_date
            )
          )
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error
      setTalent(data)
      setNotes(data.notes || "")
    } catch (error) {
      console.error("Error fetching talent profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async (newNotes: string) => {
    if (!talent || savingNotes) return
    
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from("talent")
        .update({ notes: newNotes })
        .eq("id", talent.id)

      if (error) throw error
      
      setTalent(prev => prev ? { ...prev, notes: newNotes } : null)
    } catch (error) {
      console.error("Error saving notes:", error)
      // Revert notes on error
      setNotes(talent.notes || "")
    } finally {
      setSavingNotes(false)
    }
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
  }

  const handleNotesBlur = () => {
    if (notes !== (talent?.notes || "")) {
      saveNotes(notes)
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

  if (!talent) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Talent profile not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-lg">
                  {talent.first_name[0]}
                  {talent.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {talent.first_name} {talent.last_name}
                </h1>
                <p className="text-muted-foreground">{talent.rep_email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className="bg-blue-500 dark:bg-blue-400 text-white">
                    Active
                  </Badge>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">Projects: </span>
                    <span className="ml-1">
                      {talent.talent_project_assignments?.filter(a => a.status === 'active').length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {talent.rep_phone && (
                <Button variant="outline" onClick={() => window.open(`tel:${talent.rep_phone}`)}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call Rep
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects
          </TabsTrigger>
          <TabsTrigger value="profile">
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Representative Contact */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Representative Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="mt-1 text-lg">{talent.rep_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="mt-1">
                      <a 
                        href={`mailto:${talent.rep_email}`}
                        className="text-blue-600 hover:underline text-lg"
                      >
                        {talent.rep_email}
                      </a>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="mt-1">
                      <a 
                        href={`tel:${talent.rep_phone}`}
                        className="text-blue-600 hover:underline text-lg"
                      >
                        {talent.rep_phone}
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Notes
                  {savingNotes && (
                    <span className="ml-2 text-xs text-muted-foreground">Saving...</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes about this talent..."
                  className="min-h-[120px] resize-y"
                  disabled={savingNotes}
                />
              </CardContent>
            </Card>

            {/* Current Project Assignments */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Current Project Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {talent.talent_project_assignments?.filter(a => a.status === 'active').length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active project assignments</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {talent.talent_project_assignments
                      ?.filter(a => a.status === 'active')
                      .map((assignment) => (
                        <Badge key={assignment.id} variant="secondary">
                          {assignment.projects?.name || "Unknown Project"}
                        </Badge>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <TalentProjectManager talent={talent} onUpdate={fetchTalentProfile} />
        </TabsContent>

        <TabsContent value="profile">
          <TalentProfileForm talent={talent} onUpdate={fetchTalentProfile} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
