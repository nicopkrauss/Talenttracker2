"use client"

import { Suspense, useState, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { ProjectForm } from '@/components/projects/project-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { ProjectFormData, Project } from '@/lib/types'
import { use } from 'react'

interface EditProjectPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Validate that the ID is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(resolvedParams.id)) {
    notFound()
  }

  useEffect(() => {
    fetchProject()
  }, [resolvedParams.id])

  const fetchProject = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${resolvedParams.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          notFound()
        }
        throw new Error('Failed to load project')
      }
      
      const responseData = await response.json()
      console.log('Fetched project data for edit:', responseData.data)
      setProject(responseData.data)
    } catch (err: any) {
      console.error('Error fetching project:', err)
      setError(err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ProjectFormData) => {
    const response = await fetch(`/api/projects/${resolvedParams.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update project')
    }

    router.push(`/projects/${resolvedParams.id}`)
  }

  const handleCancel = () => {
    router.push(`/projects/${resolvedParams.id}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-center justify-center mb-6">
            <h1 className="text-2xl font-bold">Edit Project</h1>
          </div>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute left-0">
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold">Edit Project</h1>
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Centered form container */}
      <div className="max-w-2xl mx-auto">
        {/* Header with back button (left) and centered title */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute left-0">
            <Link href={`/projects/${resolvedParams.id}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Project
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Edit Project</h1>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <ProjectForm 
            mode="edit" 
            initialData={project || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </Suspense>
      </div>
    </div>
  )
}