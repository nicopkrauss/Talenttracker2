import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ProjectDetailView } from '@/components/projects/project-detail-view'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ProjectDetailPageProps {
  params: {
    id: string
  }
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  // Validate that the ID is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(params.id)) {
    notFound()
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
        <h1 className="text-2xl font-bold">Project Details</h1>
      </div>
      
      <Suspense fallback={<LoadingSpinner />}>
        <ProjectDetailView projectId={params.id} />
      </Suspense>
    </div>
  )
}