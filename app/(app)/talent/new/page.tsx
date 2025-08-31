"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { talentProfileSchema } from "@/lib/types"

export default function NewTalentPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    project_id: "",
    first_name: "",
    last_name: "",
    rep_name: "",
    rep_email: "",
    rep_phone: "",
    notes: ""
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const validateForm = () => {
    try {
      const validationData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        rep_name: formData.rep_name,
        rep_email: formData.rep_email,
        rep_phone: formData.rep_phone,
        notes: formData.notes
      }
      talentProfileSchema.parse(validationData)
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path.join('.')
          fieldErrors[field] = err.message
        })
      }
      setErrors(fieldErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      // Create the talent profile
      const { data: talentData, error: talentError } = await supabase
        .from("talent")
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          rep_name: formData.rep_name,
          rep_email: formData.rep_email,
          rep_phone: formData.rep_phone,
          notes: formData.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (talentError) throw talentError

      // If a project is selected, create the assignment
      if (formData.project_id && talentData) {
        const { error: assignmentError } = await supabase
          .from("talent_project_assignments")
          .insert({
            talent_id: talentData.id,
            project_id: formData.project_id,
            assigned_at: new Date().toISOString(),
            status: 'active'
          })

        if (assignmentError) {
          console.error("Error creating project assignment:", assignmentError)
          // Don't throw here, talent was created successfully
        }
      }

      router.push(`/talent/${talentData.id}`)
    } catch (error) {
      console.error("Error creating talent profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Talent</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Select value={formData.project_id} onValueChange={(value) => handleChange("project_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {/* Add project options dynamically */}
                  <SelectItem value="project1">Sample Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    className={errors.first_name ? "border-destructive" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive mt-1">{errors.first_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    className={errors.last_name ? "border-destructive" : ""}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive mt-1">{errors.last_name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Representative Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Representative Information</h3>
              <div className="grid gap-4 md:grid-cols-1">
                <div>
                  <Label htmlFor="rep_name">Representative Name *</Label>
                  <Input
                    id="rep_name"
                    value={formData.rep_name}
                    onChange={(e) => handleChange("rep_name", e.target.value)}
                    placeholder="Full name of talent representative"
                    className={errors.rep_name ? "border-destructive" : ""}
                  />
                  {errors.rep_name && (
                    <p className="text-sm text-destructive mt-1">{errors.rep_name}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="rep_email">Representative Email *</Label>
                    <Input
                      id="rep_email"
                      type="email"
                      value={formData.rep_email}
                      onChange={(e) => handleChange("rep_email", e.target.value)}
                      placeholder="representative@example.com"
                      className={errors.rep_email ? "border-destructive" : ""}
                    />
                    {errors.rep_email && (
                      <p className="text-sm text-destructive mt-1">{errors.rep_email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="rep_phone">Representative Phone *</Label>
                    <Input
                      id="rep_phone"
                      type="tel"
                      value={formData.rep_phone}
                      onChange={(e) => handleChange("rep_phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      className={errors.rep_phone ? "border-destructive" : ""}
                    />
                    {errors.rep_phone && (
                      <p className="text-sm text-destructive mt-1">{errors.rep_phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>



            {/* Enhanced Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notes</h3>
              <div>
                <Label htmlFor="notes">Additional Information</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Any additional notes, special requirements, dietary restrictions, or other important information about this talent..."
                  className={`min-h-[120px] ${errors.notes ? "border-destructive" : ""}`}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.notes && (
                    <p className="text-sm text-destructive">{errors.notes}</p>
                  )}
                  <p className="text-sm text-muted-foreground ml-auto">
                    {formData.notes.length}/1000 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Form Validation Summary */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please correct the errors above before saving.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Creating..." : "Create Talent Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
