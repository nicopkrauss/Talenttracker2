"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InfoTab } from './tabs/info-tab'
import { RolesTeamTab } from './tabs/roles-team-tab'
import { TalentRosterTab } from './tabs/talent-roster-tab'
import { AssignmentsTab } from './tabs/assignments-tab'
import { SettingsTab } from './tabs/settings-tab'
import { EnhancedProject } from '@/lib/types'
import { Users, UserCheck } from 'lucide-react'

interface ProjectTabsProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export const ProjectTabs = React.memo(function ProjectTabs({ project, onProjectUpdate }: ProjectTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get active tab from URL params, default to 'info'
  const urlTab = searchParams.get('tab')
  const validTabs = ['info', 'roles-team', 'talent-roster', 'assignments', 'settings']
  const initialTab = validTabs.includes(urlTab || '') ? urlTab! : 'info'
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set([initialTab]))
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Sync with URL changes
  useEffect(() => {
    const currentUrlTab = searchParams.get('tab')
    if (currentUrlTab && validTabs.includes(currentUrlTab) && currentUrlTab !== activeTab) {
      setActiveTab(currentUrlTab)
      // Mark tab as loaded when it becomes active
      setLoadedTabs(prev => new Set([...prev, currentUrlTab]))
    }
  }, [searchParams, activeTab])

  // Handle tab change and update URL with optimized state management
  const handleTabChange = useCallback((newTab: string) => {
    if (newTab === activeTab) return // Prevent unnecessary updates
    
    // Set transitioning state to prevent visual flash
    setIsTransitioning(true)
    
    // Optimistically update the active tab immediately
    setActiveTab(newTab)
    
    // Mark the new tab as loaded
    setLoadedTabs(prev => new Set([...prev, newTab]))
    
    // Update URL with new tab parameter (use replace to avoid history pollution)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', newTab)
    router.replace(url.pathname + url.search, { scroll: false })
    
    // Clear transitioning state after a brief moment
    setTimeout(() => setIsTransitioning(false), 50)
  }, [router, activeTab])



  // Memoize tab components to prevent unnecessary re-renders
  // Use stable references and deep comparison for project data
  const tabComponents = useMemo(() => ({
    info: (
      <InfoTab 
        key={`info-${project.id}`}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    ),
    'roles-team': (
      <RolesTeamTab 
        key={`roles-team-${project.id}`}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    ),
    'talent-roster': (
      <TalentRosterTab 
        key={`talent-roster-${project.id}`}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    ),
    assignments: (
      <AssignmentsTab 
        key={`assignments-${project.id}`}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    ),
    settings: (
      <SettingsTab 
        key={`settings-${project.id}`}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    )
  }), [project.id, project.updated_at, onProjectUpdate])

  // Loading component
  const LoadingComponent = useMemo(() => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  ), [])

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info" disabled={isTransitioning}>
            Info
          </TabsTrigger>
          <TabsTrigger value="roles-team" disabled={isTransitioning}>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Roles & Team
            </div>
          </TabsTrigger>
          <TabsTrigger value="talent-roster" disabled={isTransitioning}>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Talent Roster
            </div>
          </TabsTrigger>
          <TabsTrigger value="assignments" disabled={isTransitioning}>
            Assignments
          </TabsTrigger>
          <TabsTrigger value="settings" disabled={isTransitioning}>
            Settings
          </TabsTrigger>
        </TabsList>
      
        {/* Render all loaded tabs but only show the active one */}
        <div className="mt-6">
          {/* Info Tab */}
          <div 
            className={activeTab === 'info' ? 'block' : 'hidden'}
            role="tabpanel"
            aria-labelledby="info-tab"
          >
            {loadedTabs.has('info') ? tabComponents.info : LoadingComponent}
          </div>
          
          {/* Roles & Team Tab */}
          <div 
            className={activeTab === 'roles-team' ? 'block' : 'hidden'}
            role="tabpanel"
            aria-labelledby="roles-team-tab"
          >
            {loadedTabs.has('roles-team') ? tabComponents['roles-team'] : LoadingComponent}
          </div>
          
          {/* Talent Roster Tab */}
          <div 
            className={activeTab === 'talent-roster' ? 'block' : 'hidden'}
            role="tabpanel"
            aria-labelledby="talent-roster-tab"
          >
            {loadedTabs.has('talent-roster') ? tabComponents['talent-roster'] : LoadingComponent}
          </div>
          
          {/* Assignments Tab */}
          <div 
            className={activeTab === 'assignments' ? 'block' : 'hidden'}
            role="tabpanel"
            aria-labelledby="assignments-tab"
          >
            {loadedTabs.has('assignments') ? tabComponents.assignments : LoadingComponent}
          </div>
          
          {/* Settings Tab */}
          <div 
            className={activeTab === 'settings' ? 'block' : 'hidden'}
            role="tabpanel"
            aria-labelledby="settings-tab"
          >
            {loadedTabs.has('settings') ? tabComponents.settings : LoadingComponent}
          </div>
        </div>
      </Tabs>
    </>
  )
})