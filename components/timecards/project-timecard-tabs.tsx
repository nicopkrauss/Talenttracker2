"use client"

import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectTimecardList } from "@/components/timecards/project-timecard-list"
import { ProjectTimecardApproval } from "@/components/timecards/project-timecard-approval"
import { ProjectPayrollSummary } from "@/components/timecards/project-payroll-summary"
import { ProjectTimecardStatistics } from "@/components/timecards/project-timecard-statistics"
import { hasAdminAccess } from "@/lib/role-utils"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
}

interface ProjectTimecardTabsProps {
  projectId: string
  project: Project
  userRole: string
}

export function ProjectTimecardTabs({ projectId, project, userRole }: ProjectTimecardTabsProps) {
  const isAdmin = useMemo(() => 
    hasAdminAccess(userRole as any), 
    [userRole]
  )

  // Function to refresh all data (for use by child components)
  const refreshAllData = async () => {
    // This will be handled by individual components
    console.log('Refreshing all project timecard data')
  }

  return (
    <div className="space-y-6">
      {/* Timecard Statistics Overview - Always Visible */}
      <ProjectTimecardStatistics 
        projectId={projectId}
        project={project}
      />

      <Tabs defaultValue="my-timecards" className="h-full flex flex-col">
        <TabsList 
          className="bg-transparent border border-border rounded-lg p-1 gap-1 w-full sm:w-auto justify-start overflow-x-auto"
          role="tablist"
          aria-label="Timecard management tabs"
        >
        <TabsTrigger 
          value="my-timecards"
          className="px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent min-h-[44px] whitespace-nowrap"
          role="tab"
          aria-selected="true"
        >
          {isAdmin ? "Breakdown" : "My Timecards"}
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger 
            value="approve"
            className="px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent min-h-[44px] whitespace-nowrap"
            role="tab"
          >
            Approve
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger 
            value="summary"
            className="px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent min-h-[44px] whitespace-nowrap"
            role="tab"
          >
            Summary
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent 
        value="my-timecards" 
        className="space-y-4"
        role="tabpanel"
        aria-labelledby="my-timecards-tab"
      >
        <ProjectTimecardList 
          projectId={projectId}
          project={project}
          userRole={userRole}
          showUserColumn={isAdmin}
          enableBulkSubmit={false}
        />
      </TabsContent>

      {isAdmin && (
        <TabsContent 
          value="approve" 
          className="space-y-4"
          role="tabpanel"
          aria-labelledby="approve-tab"
        >
          <ProjectTimecardApproval 
            projectId={projectId}
            project={project}
            onRefreshData={refreshAllData}
          />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent 
          value="summary" 
          className="space-y-4"
          role="tabpanel"
          aria-labelledby="summary-tab"
        >
          <ProjectPayrollSummary 
            projectId={projectId}
            project={project}
          />
        </TabsContent>
      )}
      </Tabs>
    </div>
  )
}