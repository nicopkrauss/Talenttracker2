# Project Readiness System - Integration Specification

## Overview

This spec details the complete replacement of the rigid prep/active checklist system with a flexible finalization-based readiness system. The new system provides intelligent guidance while allowing immediate operational use of all features.

## Database Migration Plan

### 1. Replace Existing Checklist System

**Drop Old System:**
```sql
-- Remove old checklist table completely
DROP TABLE IF EXISTS project_setup_checklist CASCADE;

-- Remove old activation route dependencies
-- (Will be handled in API cleanup)
```

**Create New Readiness System:**
```sql
-- Create new project readiness tracking
CREATE TABLE project_readiness (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Locations (auto-created defaults)
  has_default_locations BOOLEAN DEFAULT TRUE,
  custom_location_count INTEGER DEFAULT 0,
  locations_finalized BOOLEAN DEFAULT FALSE,
  locations_finalized_at TIMESTAMP WITH TIME ZONE,
  locations_finalized_by UUID REFERENCES profiles(id),
  locations_status VARCHAR(20) DEFAULT 'default-only',
  
  -- Roles (auto-created defaults)  
  has_default_roles BOOLEAN DEFAULT TRUE,
  custom_role_count INTEGER DEFAULT 0,
  roles_finalized BOOLEAN DEFAULT FALSE,
  roles_finalized_at TIMESTAMP WITH TIME ZONE,
  roles_finalized_by UUID REFERENCES profiles(id),
  roles_status VARCHAR(20) DEFAULT 'default-only',
  
  -- Team Assignments
  total_staff_assigned INTEGER DEFAULT 0,
  supervisor_count INTEGER DEFAULT 0,
  escort_count INTEGER DEFAULT 0,
  coordinator_count INTEGER DEFAULT 0,
  team_finalized BOOLEAN DEFAULT FALSE,
  team_finalized_at TIMESTAMP WITH TIME ZONE,
  team_finalized_by UUID REFERENCES profiles(id),
  team_status VARCHAR(20) DEFAULT 'none',
  
  -- Talent Roster
  total_talent INTEGER DEFAULT 0,
  talent_finalized BOOLEAN DEFAULT FALSE,
  talent_finalized_at TIMESTAMP WITH TIME ZONE,
  talent_finalized_by UUID REFERENCES profiles(id),
  talent_status VARCHAR(20) DEFAULT 'none',
  
  -- Assignment Progress (calculated from existing data)
  assignments_status VARCHAR(20) DEFAULT 'none',
  urgent_assignment_issues INTEGER DEFAULT 0,
  
  -- Overall Status
  overall_status VARCHAR(20) DEFAULT 'getting-started',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_locations_status CHECK (locations_status IN ('default-only', 'configured', 'finalized')),
  CONSTRAINT valid_roles_status CHECK (roles_status IN ('default-only', 'configured', 'finalized')),
  CONSTRAINT valid_team_status CHECK (team_status IN ('none', 'partial', 'finalized')),
  CONSTRAINT valid_talent_status CHECK (talent_status IN ('none', 'partial', 'finalized')),
  CONSTRAINT valid_assignments_status CHECK (assignments_status IN ('none', 'partial', 'current', 'complete')),
  CONSTRAINT valid_overall_status CHECK (overall_status IN ('getting-started', 'operational', 'production-ready'))
);

-- Create indexes for performance
CREATE INDEX idx_project_readiness_overall_status ON project_readiness(overall_status);
CREATE INDEX idx_project_readiness_last_updated ON project_readiness(last_updated);

-- Create trigger to auto-create readiness record for new projects
CREATE OR REPLACE FUNCTION create_project_readiness()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_readiness (project_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_project_readiness
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION create_project_readiness();
```

**Migration Script for Existing Projects:**
```sql
-- Create readiness records for all existing projects
INSERT INTO project_readiness (project_id)
SELECT id FROM projects 
WHERE id NOT IN (SELECT project_id FROM project_readiness);

-- Update readiness based on existing data
UPDATE project_readiness SET
  custom_location_count = (
    SELECT COUNT(*) FROM project_locations 
    WHERE project_id = project_readiness.project_id 
    AND NOT is_default
  ),
  locations_status = CASE 
    WHEN (SELECT COUNT(*) FROM project_locations WHERE project_id = project_readiness.project_id AND NOT is_default) > 0 
    THEN 'configured' 
    ELSE 'default-only' 
  END,
  
  custom_role_count = (
    SELECT COUNT(*) FROM project_role_templates 
    WHERE project_id = project_readiness.project_id
    AND role_name NOT IN ('supervisor', 'coordinator', 'talent_escort')
  ),
  roles_status = CASE 
    WHEN (SELECT COUNT(*) FROM project_role_templates WHERE project_id = project_readiness.project_id AND role_name NOT IN ('supervisor', 'coordinator', 'talent_escort')) > 0 
    THEN 'configured' 
    ELSE 'default-only' 
  END,
  
  total_staff_assigned = (
    SELECT COUNT(*) FROM team_assignments 
    WHERE project_id = project_readiness.project_id
  ),
  supervisor_count = (
    SELECT COUNT(*) FROM team_assignments ta
    JOIN project_role_templates prt ON ta.role_id = prt.id
    WHERE ta.project_id = project_readiness.project_id 
    AND prt.role_name = 'supervisor'
  ),
  escort_count = (
    SELECT COUNT(*) FROM team_assignments ta
    JOIN project_role_templates prt ON ta.role_id = prt.id
    WHERE ta.project_id = project_readiness.project_id 
    AND prt.role_name = 'talent_escort'
  ),
  coordinator_count = (
    SELECT COUNT(*) FROM team_assignments ta
    JOIN project_role_templates prt ON ta.role_id = prt.id
    WHERE ta.project_id = project_readiness.project_id 
    AND prt.role_name = 'coordinator'
  ),
  team_status = CASE 
    WHEN (SELECT COUNT(*) FROM team_assignments WHERE project_id = project_readiness.project_id) > 0 
    THEN 'partial' 
    ELSE 'none' 
  END,
  
  total_talent = (
    SELECT COUNT(*) FROM talent_project_assignments 
    WHERE project_id = project_readiness.project_id
  ),
  talent_status = CASE 
    WHEN (SELECT COUNT(*) FROM talent_project_assignments WHERE project_id = project_readiness.project_id) > 0 
    THEN 'partial' 
    ELSE 'none' 
  END;
```

### 2. Update Triggers for Real-Time Updates

```sql
-- Function to recalculate project readiness
CREATE OR REPLACE FUNCTION update_project_readiness_metrics()
RETURNS TRIGGER AS $$
DECLARE
  p_id UUID;
  loc_count INTEGER;
  role_count INTEGER;
  staff_count INTEGER;
  sup_count INTEGER;
  esc_count INTEGER;
  coord_count INTEGER;
  talent_count INTEGER;
  new_overall_status VARCHAR(20);
BEGIN
  -- Determine project_id from the triggering table
  IF TG_TABLE_NAME = 'project_locations' THEN
    p_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'project_role_templates' THEN
    p_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'team_assignments' THEN
    p_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'talent_project_assignments' THEN
    p_id := COALESCE(NEW.project_id, OLD.project_id);
  END IF;
  
  -- Calculate metrics
  SELECT COUNT(*) INTO loc_count FROM project_locations 
  WHERE project_id = p_id AND NOT is_default;
  
  SELECT COUNT(*) INTO role_count FROM project_role_templates 
  WHERE project_id = p_id AND role_name NOT IN ('supervisor', 'coordinator', 'talent_escort');
  
  SELECT COUNT(*) INTO staff_count FROM team_assignments 
  WHERE project_id = p_id;
  
  SELECT COUNT(*) INTO sup_count FROM team_assignments ta
  JOIN project_role_templates prt ON ta.role_id = prt.id
  WHERE ta.project_id = p_id AND prt.role_name = 'supervisor';
  
  SELECT COUNT(*) INTO esc_count FROM team_assignments ta
  JOIN project_role_templates prt ON ta.role_id = prt.id
  WHERE ta.project_id = p_id AND prt.role_name = 'talent_escort';
  
  SELECT COUNT(*) INTO coord_count FROM team_assignments ta
  JOIN project_role_templates prt ON ta.role_id = prt.id
  WHERE ta.project_id = p_id AND prt.role_name = 'coordinator';
  
  SELECT COUNT(*) INTO talent_count FROM talent_project_assignments 
  WHERE project_id = p_id;
  
  -- Determine overall status
  IF staff_count > 0 AND talent_count > 0 AND sup_count > 0 AND esc_count > 0 THEN
    new_overall_status := 'production-ready';
  ELSIF staff_count > 0 OR talent_count > 0 THEN
    new_overall_status := 'operational';
  ELSE
    new_overall_status := 'getting-started';
  END IF;
  
  -- Update readiness record
  UPDATE project_readiness SET
    custom_location_count = loc_count,
    locations_status = CASE 
      WHEN locations_finalized THEN 'finalized'
      WHEN loc_count > 0 THEN 'configured' 
      ELSE 'default-only' 
    END,
    
    custom_role_count = role_count,
    roles_status = CASE 
      WHEN roles_finalized THEN 'finalized'
      WHEN role_count > 0 THEN 'configured' 
      ELSE 'default-only' 
    END,
    
    total_staff_assigned = staff_count,
    supervisor_count = sup_count,
    escort_count = esc_count,
    coordinator_count = coord_count,
    team_status = CASE 
      WHEN team_finalized THEN 'finalized'
      WHEN staff_count > 0 THEN 'partial' 
      ELSE 'none' 
    END,
    
    total_talent = talent_count,
    talent_status = CASE 
      WHEN talent_finalized THEN 'finalized'
      WHEN talent_count > 0 THEN 'partial' 
      ELSE 'none' 
    END,
    
    overall_status = new_overall_status,
    last_updated = NOW()
  WHERE project_id = p_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all relevant tables
CREATE TRIGGER trigger_update_readiness_locations
  AFTER INSERT OR UPDATE OR DELETE ON project_locations
  FOR EACH ROW EXECUTE FUNCTION update_project_readiness_metrics();

CREATE TRIGGER trigger_update_readiness_roles
  AFTER INSERT OR UPDATE OR DELETE ON project_role_templates
  FOR EACH ROW EXECUTE FUNCTION update_project_readiness_metrics();

CREATE TRIGGER trigger_update_readiness_team
  AFTER INSERT OR UPDATE OR DELETE ON team_assignments
  FOR EACH ROW EXECUTE FUNCTION update_project_readiness_metrics();

CREATE TRIGGER trigger_update_readiness_talent
  AFTER INSERT OR UPDATE OR DELETE ON talent_project_assignments
  FOR EACH ROW EXECUTE FUNCTION update_project_readiness_metrics();
```

## API Route Changes

### 1. Remove Old Activation System

**Files to Remove/Update:**
- `app/api/projects/[id]/activate/route.ts` - Remove completely
- `app/api/projects/[id]/checklist/route.ts` - Remove completely

### 2. Create New Readiness API Routes

**New Route: `app/api/projects/[id]/readiness/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project readiness with assignment progress
    const { data: readiness, error } = await supabase
      .from('project_readiness')
      .select(`
        *,
        projects!inner(
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq('project_id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate assignment progress from existing escort assignment tracker logic
    const assignmentProgress = await calculateAssignmentProgress(supabase, params.id)
    
    // Generate todo items based on current status
    const todoItems = generateTodoItems(readiness, assignmentProgress)
    
    return NextResponse.json({
      ...readiness,
      assignmentProgress,
      todoItems
    })

  } catch (error) {
    console.error('Error fetching project readiness:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateAssignmentProgress(supabase: any, projectId: string) {
  // Use existing escort assignment tracker logic
  // This would integrate with the existing assignment system
  // Return urgent issues and upcoming day status
  return {
    urgentIssues: 0,
    upcomingDays: [],
    overallStatus: 'none'
  }
}

function generateTodoItems(readiness: any, assignmentProgress: any) {
  const items = []
  
  // Critical items (red)
  if (readiness.team_status === 'none') {
    items.push({
      id: 'assign-team',
      area: 'team',
      priority: 'critical',
      title: 'Assign team members',
      description: 'Add staff to enable time tracking and operations',
      actionText: 'Go to Roles & Team',
      actionRoute: '/projects/' + readiness.project_id + '?tab=roles-team'
    })
  }
  
  if (readiness.talent_status === 'none') {
    items.push({
      id: 'add-talent',
      area: 'talent',
      priority: 'critical',
      title: 'Add talent',
      description: 'Add talent to enable assignments and location tracking',
      actionText: 'Go to Talent Roster',
      actionRoute: '/projects/' + readiness.project_id + '?tab=talent-roster'
    })
  }
  
  // Important items (yellow)
  if (readiness.team_status === 'partial' && !readiness.team_finalized) {
    items.push({
      id: 'finalize-team',
      area: 'team',
      priority: 'important',
      title: 'Finalize team assignments',
      description: `${readiness.total_staff_assigned} staff assigned but not confirmed ready`,
      actionText: 'Go to Roles & Team',
      actionRoute: '/projects/' + readiness.project_id + '?tab=roles-team'
    })
  }
  
  // Add more todo items based on status...
  
  return items
}
```

**New Route: `app/api/projects/[id]/readiness/finalize/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (admin/in_house only)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'in_house'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { area } = await request.json()
    
    const updateData: any = {
      last_updated: new Date().toISOString()
    }
    
    // Set finalization fields based on area
    switch (area) {
      case 'locations':
        updateData.locations_finalized = true
        updateData.locations_finalized_at = new Date().toISOString()
        updateData.locations_finalized_by = user.id
        updateData.locations_status = 'finalized'
        break
      case 'roles':
        updateData.roles_finalized = true
        updateData.roles_finalized_at = new Date().toISOString()
        updateData.roles_finalized_by = user.id
        updateData.roles_status = 'finalized'
        break
      case 'team':
        updateData.team_finalized = true
        updateData.team_finalized_at = new Date().toISOString()
        updateData.team_finalized_by = user.id
        updateData.team_status = 'finalized'
        break
      case 'talent':
        updateData.talent_finalized = true
        updateData.talent_finalized_at = new Date().toISOString()
        updateData.talent_finalized_by = user.id
        updateData.talent_status = 'finalized'
        break
      default:
        return NextResponse.json({ error: 'Invalid area' }, { status: 400 })
    }

    const { error } = await supabase
      .from('project_readiness')
      .update(updateData)
      .eq('project_id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error finalizing area:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Project Mode System

### Overview
Replace the current status-based view switching (prep → active) with a user-controlled mode toggle that allows admins and in-house users to switch between configuration and operations modes at any time.

### Mode Definitions

**Configuration Mode:**
- Shows tabbed interface (Info, Roles & Team, Talent Roster, Assignments, Settings)
- Used for project setup, management, and configuration
- Available to all roles but with different permissions
- Default mode for new projects

**Operations Mode:**
- Shows live operations dashboard
- Used during active production for real-time monitoring
- Available to all roles but with different capabilities
- Optimal for supervisors, coordinators, and escorts during shifts

### Role-Based Mode Access

**Admin & In-House:**
- Can switch between both modes freely
- See mode toggle button in header
- Default to Configuration mode

**Supervisor & Coordinator:**
- Can switch between both modes freely  
- See mode toggle button in header
- May default to Operations mode (configurable)

**Talent Escort:**
- Can switch between both modes freely
- See mode toggle button in header
- Should default to Operations mode for shift work

### Header Mode Toggle

**Visual Design:**
```
┌─ Project Header ────────────────────────────────────────────┐
│ [Back] Project Name • Status Badge    [Config|Ops]  [Edit] │
└─────────────────────────────────────────────────────────────┘
```

**Toggle Button Specs:**
- Centered in header between project title and edit button
- Segmented control style: `Configuration | Operations`
- Active state clearly indicated
- Keyboard accessible
- Mobile-friendly touch targets

## Frontend Component Changes

### 1. Update Project Header Component

**File: `components/projects/project-header.tsx`**

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Settings, Activity } from 'lucide-react'

interface ProjectHeaderProps {
  project: Project;
  currentMode: 'configuration' | 'operations';
  onModeChange: (mode: 'configuration' | 'operations') => void;
  onEdit?: () => void;
  canSwitchModes?: boolean;
}

export function ProjectHeader({ 
  project, 
  currentMode, 
  onModeChange, 
  onEdit,
  canSwitchModes = true 
}: ProjectHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Back button and project info */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <Badge variant={getStatusVariant(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>
        </div>

        {/* Center: Mode toggle */}
        {canSwitchModes && (
          <div className="flex items-center">
            <div className="inline-flex rounded-lg border border-border p-1 bg-muted">
              <Button
                variant={currentMode === 'configuration' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('configuration')}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Configuration</span>
              </Button>
              <Button
                variant={currentMode === 'operations' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('operations')}
                className="flex items-center space-x-2"
              >
                <Activity className="h-4 w-4" />
                <span>Operations</span>
              </Button>
            </div>
          </div>
        )}

        {/* Right: Edit button */}
        {onEdit && (
          <Button variant="outline" onClick={onEdit}>
            Edit Project
          </Button>
        )}
      </div>
    </div>
  )
}
```

### 2. Update Project Detail Layout

**File: `components/projects/project-detail-layout.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { ProjectHeader } from './project-header'
import { ProjectTabs } from './project-tabs'
import { OperationsDashboard } from './operations-dashboard'
import { useProjectReadiness } from '@/hooks/use-project-readiness'

interface ProjectDetailLayoutProps {
  project: Project;
  initialMode?: 'configuration' | 'operations';
}

export function ProjectDetailLayout({ project, initialMode }: ProjectDetailLayoutProps) {
  const [currentMode, setCurrentMode] = useState<'configuration' | 'operations'>(
    initialMode || getDefaultModeForUser()
  )
  const { readiness } = useProjectReadiness(project.id)

  // Persist mode preference in localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(`project-${project.id}-mode`)
    if (savedMode && ['configuration', 'operations'].includes(savedMode)) {
      setCurrentMode(savedMode as 'configuration' | 'operations')
    }
  }, [project.id])

  const handleModeChange = (mode: 'configuration' | 'operations') => {
    setCurrentMode(mode)
    localStorage.setItem(`project-${project.id}-mode`, mode)
  }

  const canSwitchModes = true // All roles can switch modes

  return (
    <div className="min-h-screen bg-background">
      <ProjectHeader
        project={project}
        currentMode={currentMode}
        onModeChange={handleModeChange}
        onEdit={() => window.location.href = `/projects/${project.id}/edit`}
        canSwitchModes={canSwitchModes}
      />

      <div className="container mx-auto px-6 py-6">
        {currentMode === 'configuration' ? (
          <ProjectTabs project={project} readiness={readiness} />
        ) : (
          <OperationsDashboard project={project} />
        )}
      </div>
    </div>
  )
}

function getDefaultModeForUser(): 'configuration' | 'operations' {
  // This would check user role and preferences
  // For now, default to configuration for all users
  return 'configuration'
}
```

### 3. Update Project Overview Card (Configuration Mode Only)

**File: `components/projects/project-overview-card.tsx`**

The project overview card now only appears in Configuration mode and shows simplified readiness status:

```typescript
// This component only renders in Configuration mode
interface ProjectOverviewCardProps {
  project: Project;
  readiness?: ProjectReadiness;
  onEdit?: () => void;
}

// Replace checklist section with:
{readiness && (
  <div className="mt-4 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Setup Status</span>
      <Badge variant={getStatusVariant(readiness.overall_status)}>
        {getStatusLabel(readiness.overall_status)}
      </Badge>
    </div>
    
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center space-x-1">
        {readiness.team_status === 'finalized' ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : readiness.total_staff_assigned > 0 ? (
          <AlertCircle className="h-3 w-3 text-yellow-500" />
        ) : (
          <XCircle className="h-3 w-3 text-red-500" />
        )}
        <span>Time tracking {readiness.total_staff_assigned > 0 ? 'ready' : 'needs setup'}</span>
      </div>
      
      <div className="flex items-center space-x-1">
        {readiness.urgent_assignment_issues === 0 ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : (
          <AlertCircle className="h-3 w-3 text-yellow-500" />
        )}
        <span>
          {readiness.urgent_assignment_issues === 0 
            ? 'Assignments ready' 
            : `${readiness.urgent_assignment_issues} urgent issues`
          }
        </span>
      </div>
    </div>
    
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full mt-2"
      onClick={() => {
        // Navigate to Info tab in Configuration mode
        const url = new URL(window.location.href)
        url.searchParams.set('tab', 'info')
        url.searchParams.set('mode', 'configuration')
        window.location.href = url.toString()
      }}
    >
      View full dashboard in Info tab
    </Button>
  </div>
)}
```

### 2. Create New Info Tab Dashboard

**File: `components/projects/tabs/info-tab-dashboard.tsx`**

```typescript
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, XCircle, Lightbulb } from 'lucide-react'

interface InfoTabDashboardProps {
  projectId: string;
  readiness: ProjectReadiness;
  onFinalize: (area: string) => void;
}

export function InfoTabDashboard({ projectId, readiness, onFinalize }: InfoTabDashboardProps) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(true)
  
  const todoItems = readiness.todoItems || []
  const criticalItems = todoItems.filter(item => item.priority === 'critical')
  const importantItems = todoItems.filter(item => item.priority === 'important')
  const optionalItems = todoItems.filter(item => item.priority === 'optional')
  
  return (
    <div className="space-y-4">
      {/* Project Status Dashboard - Collapsible */}
      <Collapsible open={isDashboardOpen} onOpenChange={setIsDashboardOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  {isDashboardOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span>Project Status</span>
                </CardTitle>
                <Badge variant={getStatusVariant(readiness.overall_status)}>
                  {getStatusLabel(readiness.overall_status)}
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* To-Do List */}
              {(criticalItems.length > 0 || importantItems.length > 0 || optionalItems.length > 0) && (
                <div className="space-y-4">
                  <h4 className="font-medium">To-Do List</h4>
                  
                  {/* Critical Items */}
                  {criticalItems.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-red-600 dark:text-red-400">Critical:</h5>
                      {criticalItems.map(item => (
                        <TodoItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                  
                  {/* Important Items */}
                  {importantItems.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Important:</h5>
                      {importantItems.map(item => (
                        <TodoItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                  
                  {/* Optional Items */}
                  {optionalItems.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-blue-600 dark:text-blue-400">Optional:</h5>
                      {optionalItems.map(item => (
                        <TodoItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Completed Setup */}
              <div className="space-y-2">
                <h4 className="font-medium">Completed Setup</h4>
                <div className="grid grid-cols-1 gap-2">
                  {readiness.locations_status === 'finalized' && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>Locations configured</span>
                    </div>
                  )}
                  {readiness.roles_status === 'finalized' && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>Role templates configured</span>
                    </div>
                  )}
                  {readiness.team_status === 'finalized' && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>Team assignments ready</span>
                    </div>
                  )}
                  {readiness.talent_status === 'finalized' && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>Talent roster complete</span>
                    </div>
                  )}
                  {readiness.total_staff_assigned > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>Time tracking available</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Assignment Progress Summary */}
              {readiness.assignmentProgress && (
                <div className="space-y-2">
                  <h4 className="font-medium">Assignment Progress</h4>
                  <AssignmentProgressSummary progress={readiness.assignmentProgress} projectId={projectId} />
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}

function TodoItem({ item }: { item: TodoItem }) {
  const Icon = item.priority === 'critical' ? XCircle : 
               item.priority === 'important' ? AlertCircle : Lightbulb
  
  const iconColor = item.priority === 'critical' ? 'text-red-500' :
                    item.priority === 'important' ? 'text-yellow-500' : 'text-blue-500'
  
  return (
    <div className="flex items-start space-x-3 p-3 border rounded-lg">
      <Icon className={`h-4 w-4 mt-0.5 ${iconColor}`} />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => window.location.href = item.actionRoute}
      >
        {item.actionText}
      </Button>
    </div>
  )
}

function AssignmentProgressSummary({ progress, projectId }: { progress: any, projectId: string }) {
  // Show urgent assignment issues and quick summary
  // This would integrate with existing assignment tracker data
  return (
    <div className="space-y-2">
      {progress.urgentIssues > 0 ? (
        <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <span className="text-sm">
            {progress.urgentIssues} talent need escorts for upcoming days
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = `/projects/${projectId}?tab=assignments`}
          >
            Go to Assignments
          </Button>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>All urgent assignments complete</span>
        </div>
      )}
    </div>
  )
}
```

### 3. Update Info Tab Layout

**File: `components/projects/tabs/info-tab.tsx`**

```typescript
// Add the dashboard at the top and make existing sections collapsible
export function InfoTab({ project }: InfoTabProps) {
  const [readiness, setReadiness] = useState<ProjectReadiness | null>(null)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const [isLocationsOpen, setIsLocationsOpen] = useState(false)
  
  // Fetch readiness data
  useEffect(() => {
    fetchProjectReadiness()
  }, [project.id])
  
  return (
    <div className="space-y-6">
      {/* Dashboard at top */}
      {readiness && (
        <InfoTabDashboard 
          projectId={project.id}
          readiness={readiness}
          onFinalize={handleFinalize}
        />
      )}
      
      {/* Existing sections made collapsible */}
      <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <CardTitle className="flex items-center space-x-2">
                {isDescriptionOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Project Description</span>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent>
              {/* Existing description editor */}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      <Collapsible open={isLocationsOpen} onOpenChange={setIsLocationsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isLocationsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span>Talent Locations</span>
                </div>
                
                {/* Finalization button */}
                {readiness?.locations_status !== 'finalized' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFinalize('locations')
                    }}
                  >
                    Finalize Location Setup
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent>
              {/* Existing location manager */}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
```

### 4. Add Finalization Buttons to Other Tabs

**Roles & Team Tab:**
```typescript
// Add finalization button to header
{readiness?.team_status !== 'finalized' && (
  <Button 
    variant="outline"
    onClick={() => handleFinalize('team')}
  >
    Finalize Team Assignments
  </Button>
)}
```

**Talent Roster Tab:**
```typescript
// Add finalization button to header
{readiness?.talent_status !== 'finalized' && (
  <Button 
    variant="outline"
    onClick={() => handleFinalize('talent')}
  >
    Finalize Talent Roster
  </Button>
)}
```

### 4. Update Operations Dashboard Integration

**File: `components/projects/operations-dashboard.tsx`**

The existing operations dashboard remains largely unchanged but gets integrated into the new mode system:

```typescript
// The operations dashboard now receives the full project context
interface OperationsDashboardProps {
  project: Project;
  // All existing props remain the same
}

export function OperationsDashboard({ project }: OperationsDashboardProps) {
  // All existing functionality remains
  // This component is now accessed via mode toggle instead of project status
  
  return (
    <div className="space-y-6">
      {/* All existing dashboard content */}
      {/* Live KPIs, Talent Locations Board, Team Status Board, etc. */}
    </div>
  )
}
```

### 5. URL State Management

**File: `app/(app)/projects/[id]/page.tsx`**

```typescript
import { useSearchParams } from 'next/navigation'

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') as 'configuration' | 'operations' || undefined
  const initialTab = searchParams.get('tab') || undefined

  // ... existing project fetching logic

  return (
    <ProjectDetailLayout 
      project={project}
      initialMode={initialMode}
      initialTab={initialTab}
    />
  )
}
```

**URL Examples:**
- `/projects/123` - Default mode (configuration)
- `/projects/123?mode=operations` - Operations mode
- `/projects/123?mode=configuration&tab=info` - Configuration mode, Info tab
- `/projects/123?mode=configuration&tab=assignments` - Configuration mode, Assignments tab

### 6. Mode Persistence and User Preferences

**File: `lib/project-mode-service.ts`**

```typescript
export class ProjectModeService {
  private static STORAGE_KEY = 'project-mode-preferences'

  static getDefaultMode(userRole: string): 'configuration' | 'operations' {
    // Role-based defaults
    switch (userRole) {
      case 'talent_escort':
        return 'operations' // Escorts likely want operations view
      case 'supervisor':
      case 'coordinator':
        return 'operations' // Operational roles default to operations
      case 'admin':
      case 'in_house':
      default:
        return 'configuration' // Management roles default to configuration
    }
  }

  static saveProjectMode(projectId: string, mode: 'configuration' | 'operations') {
    try {
      const preferences = this.getPreferences()
      preferences[projectId] = mode
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save project mode preference:', error)
    }
  }

  static getProjectMode(projectId: string, userRole: string): 'configuration' | 'operations' {
    try {
      const preferences = this.getPreferences()
      return preferences[projectId] || this.getDefaultMode(userRole)
    } catch (error) {
      return this.getDefaultMode(userRole)
    }
  }

  private static getPreferences(): Record<string, 'configuration' | 'operations'> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      return {}
    }
  }
}
```

## Service Layer Changes

### 1. Create Project Readiness Service

**File: `lib/project-readiness-service.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export interface ProjectReadiness {
  project_id: string;
  locations_status: 'default-only' | 'configured' | 'finalized';
  roles_status: 'default-only' | 'configured' | 'finalized';
  team_status: 'none' | 'partial' | 'finalized';
  talent_status: 'none' | 'partial' | 'finalized';
  assignments_status: 'none' | 'partial' | 'current' | 'complete';
  overall_status: 'getting-started' | 'operational' | 'production-ready';
  total_staff_assigned: number;
  total_talent: number;
  urgent_assignment_issues: number;
  todoItems?: TodoItem[];
  assignmentProgress?: AssignmentProgress;
}

export interface TodoItem {
  id: string;
  area: 'locations' | 'roles' | 'team' | 'talent' | 'assignments';
  priority: 'critical' | 'important' | 'optional';
  title: string;
  description: string;
  actionText: string;
  actionRoute: string;
}

export class ProjectReadinessService {
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async getProjectReadiness(projectId: string): Promise<ProjectReadiness | null> {
    const { data, error } = await this.supabase
      .from('project_readiness')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error) {
      console.error('Error fetching project readiness:', error)
      return null
    }

    return data
  }

  async finalizeArea(projectId: string, area: string): Promise<boolean> {
    const response = await fetch(`/api/projects/${projectId}/readiness/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ area }),
    })

    return response.ok
  }

  async getFeatureAvailability(readiness: ProjectReadiness) {
    return {
      timeTracking: readiness.total_staff_assigned > 0,
      assignments: readiness.total_talent > 0 && readiness.total_staff_assigned > 0,
      locationTracking: readiness.locations_status !== 'default-only' && readiness.assignments_status !== 'none',
      supervisorCheckout: readiness.team_status !== 'none' // Has supervisor assigned
    }
  }
}
```

### 2. Create Custom Hook

**File: `hooks/use-project-readiness.ts`**

```typescript
import { useState, useEffect } from 'react'
import { ProjectReadinessService, ProjectReadiness } from '@/lib/project-readiness-service'

export function useProjectReadiness(projectId: string) {
  const [readiness, setReadiness] = useState<ProjectReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const service = new ProjectReadinessService()
  
  const fetchReadiness = async () => {
    try {
      setLoading(true)
      const data = await service.getProjectReadiness(projectId)
      setReadiness(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch readiness')
    } finally {
      setLoading(false)
    }
  }
  
  const finalize = async (area: string) => {
    try {
      const success = await service.finalizeArea(projectId, area)
      if (success) {
        await fetchReadiness() // Refresh data
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize')
      return false
    }
  }
  
  useEffect(() => {
    if (projectId) {
      fetchReadiness()
    }
  }, [projectId])
  
  return {
    readiness,
    loading,
    error,
    finalize,
    refresh: fetchReadiness
  }
}
```

## Testing Strategy

### 1. Database Migration Tests

**File: `scripts/test-readiness-migration.js`**

```javascript
// Test the migration from old checklist to new readiness system
// Verify all existing projects get readiness records
// Test trigger functionality
// Validate data integrity
```

### 2. Component Tests

**File: `components/projects/tabs/__tests__/info-tab-dashboard.test.tsx`**

```typescript
// Test dashboard rendering with different readiness states
// Test collapsible functionality
// Test todo item generation
// Test finalization buttons
```

### 3. API Route Tests

**File: `app/api/projects/[id]/readiness/__tests__/route.test.ts`**

```typescript
// Test readiness data fetching
// Test permission checks for finalization
// Test todo item generation logic
// Test assignment progress calculation
```

### 4. Integration Tests

**File: `lib/__tests__/project-readiness-integration.test.ts`**

```typescript
// Test complete workflow from project creation to finalization
// Test real-time updates when data changes
// Test feature availability logic
// Test cross-tab synchronization
```

## Benefits of Mode Toggle System

### 1. **Flexible Access**
- All roles can access both configuration and operations views
- No artificial barriers based on project status
- Users can switch context based on current task

### 2. **Role-Appropriate Defaults**
- Escorts default to operations mode for shift work
- Admins default to configuration mode for management
- User preferences are remembered per project

### 3. **Seamless Workflow**
- Admins can quickly switch to operations during active production
- Supervisors can access configuration when needed
- No need to "activate" projects to access operational features

### 4. **URL-Based Navigation**
- Direct links to specific modes and tabs
- Bookmarkable operational views
- Shareable configuration links

### 5. **Maintains Existing Functionality**
- All current operations dashboard features preserved
- All current configuration tabs remain functional
- Existing user workflows continue to work

## Migration Execution Plan

### Phase 1: Database Migration (Week 1)
1. Create migration script
2. Test on staging environment
3. Apply to production during maintenance window
4. Verify all existing projects have readiness records

### Phase 2: Backend API (Week 1-2)
1. Remove old activation routes
2. Create new readiness API routes
3. Test API functionality
4. Deploy backend changes

### Phase 3: Frontend Components (Week 2-3)
1. Update project overview card
2. Create info tab dashboard
3. Add finalization buttons to tabs
4. Update empty states and guidance
5. Test UI functionality

### Phase 4: Integration & Testing (Week 3)
1. End-to-end testing
2. User acceptance testing
3. Performance testing
4. Bug fixes and refinements

### Phase 5: Deployment & Monitoring (Week 4)
1. Production deployment
2. Monitor for issues
3. User feedback collection
4. Documentation updates

This comprehensive integration spec replaces the rigid prep/active system with a flexible, guidance-driven approach that matches real production workflows while maintaining all the excellent foundation work you've built.