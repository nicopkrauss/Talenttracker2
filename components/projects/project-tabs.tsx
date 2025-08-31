"use client"

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InfoTab } from './tabs/info-tab'
import { RolesTeamTab } from './tabs/roles-team-tab'
import { TalentRosterTab } from './tabs/talent-roster-tab'
import { AssignmentsTab } from './tabs/assignments-tab'
import { SettingsTab } from './tabs/settings-tab'
import { EnhancedProject } from '@/lib/types'

interface ProjectTabsProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function ProjectTabs({ project, onProjectUpdate }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState('info')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="roles-team">Roles & Team</TabsTrigger>
        <TabsTrigger value="talent-roster">Talent Roster</TabsTrigger>
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      
      <TabsContent value="info" className="mt-6">
        <InfoTab 
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>
      
      <TabsContent value="roles-team" className="mt-6">
        <RolesTeamTab 
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>
      
      <TabsContent value="talent-roster" className="mt-6">
        <TalentRosterTab 
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>
      
      <TabsContent value="assignments" className="mt-6">
        <AssignmentsTab 
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>
      
      <TabsContent value="settings" className="mt-6">
        <SettingsTab 
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>
    </Tabs>
  )
}