"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { 
  Form, 
  FormControl, 
  FormField
} from "@/components/ui/form"
import { ProjectFormField } from "./project-form-field"
import { ProjectInput, ProjectTextarea, ProjectDateInput } from "./project-input"
import { ProjectFormData, projectFormSchema, Project } from "@/lib/types"

interface ProjectFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Project>
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ProjectForm({ 
  mode, 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false 
}: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      production_company: initialData?.production_company || "",
      hiring_contact: initialData?.hiring_contact || "",
      project_location: initialData?.location || "",
      start_date: initialData?.start_date ? 
        new Date(initialData.start_date).toISOString().split('T')[0] : "",
      end_date: initialData?.end_date ? 
        new Date(initialData.end_date).toISOString().split('T')[0] : ""
    },
    mode: 'onChange'
  })

  // Clear messages when form values change
  useEffect(() => {
    const subscription = form.watch(() => {
      if (submitError) setSubmitError(null)
      if (submitSuccess) setSubmitSuccess(null)
    })
    return () => subscription.unsubscribe()
  }, [form, submitError, submitSuccess])

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      await onSubmit(data)
      setSubmitSuccess(
        mode === 'create' 
          ? "Project created successfully!" 
          : "Project updated successfully!"
      )
    } catch (error: any) {
      console.error("Form submission error:", error)
      setSubmitError(
        error.message || 
        `Failed to ${mode === 'create' ? 'create' : 'update'} project. Please try again.`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    setSubmitError(null)
    setSubmitSuccess(null)
    onCancel()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Create New Project' : 'Edit Project'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create New Project' : 'Edit Project'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Success Message */}
            {submitSuccess && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-300">
                  {submitSuccess}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {submitError}
                </AlertDescription>
              </Alert>
            )}

            {/* Required Fields Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">
                Project Information
              </h3>
              <p className="text-sm text-muted-foreground">
                Fields marked with * are required.
              </p>

              {/* Project Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <ProjectFormField
                    label="Project Name *"
                    description="Enter the name of the project or production"
                    error={form.formState.errors.name?.message}
                    required
                  >
                    <FormControl>
                      <ProjectInput
                        {...field}
                        placeholder="e.g., Summer Blockbuster 2024"
                        error={!!form.formState.errors.name}
                        success={!form.formState.errors.name && field.value.length > 0}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </ProjectFormField>
                )}
              />

              {/* Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <ProjectFormField
                      label="Start Date *"
                      description="When the project begins"
                      error={form.formState.errors.start_date?.message}
                      required
                    >
                      <FormControl>
                        <ProjectDateInput
                          {...field}
                          error={!!form.formState.errors.start_date}
                          success={!form.formState.errors.start_date && field.value.length > 0}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </ProjectFormField>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <ProjectFormField
                      label="End Date *"
                      description="When the project ends"
                      error={form.formState.errors.end_date?.message}
                      required
                    >
                      <FormControl>
                        <ProjectDateInput
                          {...field}
                          error={!!form.formState.errors.end_date}
                          success={!form.formState.errors.end_date && field.value.length > 0}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </ProjectFormField>
                  )}
                />
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">
                Additional Details
              </h3>
              <p className="text-sm text-muted-foreground">
                These fields are optional but help provide more context about the project.
              </p>

              {/* Production Company */}
              <FormField
                control={form.control}
                name="production_company"
                render={({ field }) => (
                  <ProjectFormField
                    label="Production Company"
                    description="The company producing this project"
                    error={form.formState.errors.production_company?.message}
                  >
                    <FormControl>
                      <ProjectInput
                        {...field}
                        placeholder="e.g., Universal Studios"
                        error={!!form.formState.errors.production_company}
                        success={!form.formState.errors.production_company && field.value && field.value.length > 0}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </ProjectFormField>
                )}
              />

              {/* Hiring Contact */}
              <FormField
                control={form.control}
                name="hiring_contact"
                render={({ field }) => (
                  <ProjectFormField
                    label="Hiring Contact"
                    description="Primary contact person for hiring and staffing"
                    error={form.formState.errors.hiring_contact?.message}
                  >
                    <FormControl>
                      <ProjectInput
                        {...field}
                        placeholder="e.g., Jane Smith, Casting Director"
                        error={!!form.formState.errors.hiring_contact}
                        success={!form.formState.errors.hiring_contact && field.value && field.value.length > 0}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </ProjectFormField>
                )}
              />

              {/* Project Location */}
              <FormField
                control={form.control}
                name="project_location"
                render={({ field }) => (
                  <ProjectFormField
                    label="Project Location"
                    description="Primary filming or production location"
                    error={form.formState.errors.project_location?.message}
                  >
                    <FormControl>
                      <ProjectInput
                        {...field}
                        placeholder="e.g., Los Angeles, CA"
                        error={!!form.formState.errors.project_location}
                        success={!form.formState.errors.project_location && field.value && field.value.length > 0}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </ProjectFormField>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <ProjectFormField
                    label="Description"
                    description="Brief description of the project (optional)"
                    error={form.formState.errors.description?.message}
                  >
                    <FormControl>
                      <ProjectTextarea
                        {...field}
                        placeholder="Enter a brief description of the project..."
                        rows={4}
                        error={!!form.formState.errors.description}
                        success={!form.formState.errors.description && field.value && field.value.length > 0}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </ProjectFormField>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  mode === 'create' ? 'Create Project' : 'Update Project'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}