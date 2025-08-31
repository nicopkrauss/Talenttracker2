"use client"

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectForm } from '@/components/projects/project-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProjectFormData } from '@/lib/types'

export default function NewProjectPage() {
  const router = useRouter()

  const handleSubmit = async (data: ProjectFormData) => {
    console.log('Submitting project data:', data)
    
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)

    if (!response.ok) {
      const error = await response.json()
      console.error('API Error Response:', error)
      throw new Error(error.error || 'Failed to create project')
    }

    const project = await response.json()
    console.log('Created project:', project)
    router.push(`/projects/${project.data?.id || project.id}`)
  }

  const handleCancel = () => {
    router.push('/projects')
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create New Project</h1>
      </div>
      
      <div className="max-w-2xl">
        <Suspense fallback={<LoadingSpinner />}>
          <ProjectForm 
            mode="create" 
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </Suspense>
      </div>
    </div>
  )
}