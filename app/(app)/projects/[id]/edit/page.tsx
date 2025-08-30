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

interface EditProjectPageProps {
  params: {
    id: string
  }
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Validate that the ID is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(params.id)) {
    notFound()
  }

  useEffect(() => {
    fetchProject()
  }, [params.id])

  const fetchProject = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          notFound()
        }
        throw new Error('Failed to load project')
      }
      
      const data = await response.json()
      setProject(data)
    } catch (err: any) {
      console.error('Error fetching project:', err)
      setError(err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ProjectFormData) => {
    const response = await fetch(`/api/projects/${params.id}`, {
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

    router.push(`/projects/${params.id}`)
  }

  const handleCancel = () => {
    router.push(`/projects/${params.id}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/projects/${params.id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Project</h1>
      </div>
      
      <div className="max-w-2xl">
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