"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TimecardEditPage() {
  const params = useParams()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                asChild
                className="gap-2"
              >
                <Link href={`/timecards/${params.id}`}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              Edit Timecard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Timecard ID: {params.id}</p>
              <p>This is a simplified edit page. The full functionality will be implemented once the basic routing works.</p>
              <Button asChild>
                <Link href={`/timecards/${params.id}`}>Return to Timecard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}