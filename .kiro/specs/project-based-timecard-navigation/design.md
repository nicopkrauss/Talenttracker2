# Project-Based Timecard Navigation Design

## Overview

This design document outlines the implementation of project-based timecard navigation that restructures the current single-list timecard interface into a project-grouped system. The solution provides admin users with a project selection interface similar to the existing projects page, while regular users continue to access their timecards directly. This approach improves navigation efficiency and provides better context for timecard management across multiple projects.

## Architecture

### High-Level Architecture

The project-based timecard navigation follows a two-tier architecture:

1. **Project Selection Layer** (Admin/In-House only)
   - Displays projects with timecard-specific information
   - Provides filtering and search capabilities
   - Routes to project-specific timecard views

2. **Project-Specific Timecard Layer** (All users)
   - Maintains existing breakdown/approve/summary tab structure
   - Filters all data to selected project context
   - Preserves all current timecard functionality

### URL Structure

```
/timecards                           → Project selection (admin) or direct timecards (regular users)
/timecards/project/[projectId]       → Project-specific timecard view
/timecards/project/[projectId]/[id]  → Individual timecard detail with project context
```

### Role-Based Routing Logic

```typescript
// Route determination based on user role
const determineTimecardRoute = (userRole: UserRole) => {
  if (userRole === 'admin' || userRole === 'in_house') {
    return '/timecards' // Project selection page
  } else {
    return '/timecards' // Direct to user's timecards (existing behavior)
  }
}
```

## Components and Interfaces

### 1. Project Selection Interface

#### TimecardProjectHub Component

**Location**: `components/timecards/timecard-project-hub.tsx`

**Purpose**: Main project selection interface for admin users, reusing the visual design of the existing ProjectHub component.

**Props Interface**:
```typescript
interface TimecardProjectHubProps {
  userRole: UserRole
  onSelectProject: (projectId: string) => void
}
```

**Key Features**:
- Reuses ProjectHub UI design patterns
- Displays timecard-specific project statistics
- Implements search and filtering functionality
- Shows project cards with timecard context

#### TimecardProjectCard Component

**Location**: `components/timecards/timecard-project-card.tsx`

**Purpose**: Individual project card displaying timecard-specific information, based on the existing ProjectCard component design.

**Props Interface**:
```typescript
interface TimecardProjectCardProps {
  project: Project
  timecardStats: ProjectTimecardStats
  userRole: UserRole
  onSelectProject: (projectId: string) => void
}

interface ProjectTimecardStats {
  totalTimecards: number
  statusBreakdown: {
    draft: number
    submitted: number
    approved: number
    rejected: number
  }
  totalHours: number
  totalApprovedPay: number
  lastActivity: string
  pendingApprovals?: number // Admin only
  overdueSubmissions?: number // Admin only
}
```

### 2. Enhanced Timecard Pages

#### Modified TimecardPage Component

**Location**: `app/(app)/timecards/page.tsx`

**Changes**:
- Add role-based routing logic
- Render TimecardProjectHub for admin users
- Maintain existing functionality for regular users
- Add project context when accessed via project selection

#### New Project-Specific Timecard Page

**Location**: `app/(app)/timecards/project/[projectId]/page.tsx`

**Purpose**: Project-filtered version of the existing timecard interface.

**Key Features**:
- Maintains existing tab structure (breakdown/approve/summary)
- Filters all data to selected project
- Adds project context to page header
- Preserves all existing timecard functionality

### 3. API Enhancements

#### Enhanced Timecards API

**Location**: `app/api/timecards-v2/route.ts`

**Modifications**:
- Add project-specific filtering
- Implement project statistics aggregation
- Maintain backward compatibility

**New Endpoints**:

```typescript
// Get project timecard statistics
GET /api/timecards/projects/stats
Response: ProjectTimecardStats[]

// Get timecards for specific project
GET /api/timecards-v2?project_id={projectId}
Response: { data: Timecard[], count: number }
```

#### Project Statistics API

**Location**: `app/api/timecards/projects/stats/route.ts`

**Purpose**: Aggregate timecard statistics by project for the project selection interface.

**Response Structure**:
```typescript
interface ProjectTimecardStatsResponse {
  projectId: string
  projectName: string
  totalTimecards: number
  statusBreakdown: {
    draft: number
    submitted: number
    approved: number
    rejected: number
  }
  totalHours: number
  totalApprovedPay: number
  lastActivity: string
  pendingApprovals?: number
  overdueSubmissions?: number
}
```

## Data Models

### Enhanced Project Interface

```typescript
interface ProjectWithTimecardStats extends Project {
  timecardStats: ProjectTimecardStats
}
```

### Timecard Query Parameters

```typescript
interface TimecardQueryParams {
  project_id?: string
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'
  user_id?: string
  start_date?: string
  end_date?: string
}
```

## Error Handling

### Project Access Validation

```typescript
const validateProjectAccess = async (
  projectId: string, 
  userId: string, 
  userRole: UserRole
): Promise<boolean> => {
  // Admin users can access all projects
  if (userRole === 'admin' || userRole === 'in_house') {
    return true
  }
  
  // Regular users can only access projects where they have timecards
  const { data: timecards } = await supabase
    .from('timecard_headers')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .limit(1)
  
  return timecards && timecards.length > 0
}
```

### Error States

1. **Project Not Found**: Display error message and redirect to project selection
2. **Access Denied**: Show access denied message with explanation
3. **No Timecards**: Display appropriate empty state for the context
4. **API Errors**: Provide retry mechanisms and clear error messages

## Testing Strategy

### Unit Tests

1. **Component Tests**:
   - TimecardProjectHub rendering and filtering
   - TimecardProjectCard data display
   - Role-based routing logic

2. **API Tests**:
   - Project statistics aggregation
   - Project-filtered timecard queries
   - Access control validation

3. **Utility Tests**:
   - URL routing logic
   - Permission checking functions
   - Data transformation utilities

### Integration Tests

1. **Navigation Flow**:
   - Admin project selection to project-specific view
   - Regular user direct access to timecards
   - Breadcrumb navigation functionality

2. **Data Consistency**:
   - Project statistics accuracy
   - Filtered timecard data integrity
   - Cross-tab data synchronization

### End-to-End Tests

1. **Admin Workflow**:
   - Project selection and filtering
   - Project-specific timecard management
   - Approval workflow within project context

2. **Regular User Workflow**:
   - Direct timecard access
   - Individual timecard management
   - Submission and editing processes

## Implementation Phases

### Phase 1: Core Infrastructure
- Create TimecardProjectHub and TimecardProjectCard components
- Implement project statistics API endpoint
- Add role-based routing logic to existing timecard page

### Phase 2: Project-Specific Views
- Create project-specific timecard page
- Implement project filtering in existing timecard components
- Add breadcrumb navigation and project context

### Phase 3: Enhanced Features
- Add search and filtering to project selection
- Implement project-specific empty states
- Add performance optimizations and caching

### Phase 4: Testing and Polish
- Comprehensive testing across all user roles
- Performance optimization and loading states
- Mobile responsiveness verification
- Accessibility compliance validation

## Performance Considerations

### Data Loading Strategy

1. **Project Selection Page**:
   - Load project list with basic information first
   - Lazy load timecard statistics on demand
   - Implement caching for frequently accessed data

2. **Project-Specific Views**:
   - Pre-filter data at API level
   - Implement pagination for large timecard lists
   - Cache project context information

### Optimization Techniques

1. **Query Optimization**:
   - Use database indexes on project_id and user_id columns
   - Implement efficient aggregation queries for statistics
   - Minimize N+1 query problems with proper joins

2. **Client-Side Optimization**:
   - Implement virtual scrolling for large project lists
   - Use React.memo for expensive component renders
   - Implement proper loading states and skeleton screens

## Security Considerations

### Access Control

1. **Project-Level Security**:
   - Validate project access on every API request
   - Implement row-level security policies in database
   - Ensure proper role-based filtering

2. **Data Isolation**:
   - Prevent cross-project data leakage
   - Validate user permissions for each operation
   - Implement audit logging for sensitive operations

### Input Validation

1. **API Validation**:
   - Validate all project IDs and user IDs
   - Sanitize search and filter inputs
   - Implement rate limiting for API endpoints

2. **Client-Side Validation**:
   - Validate navigation parameters
   - Prevent unauthorized route access
   - Implement proper error boundaries

## Migration Strategy

### Backward Compatibility

1. **URL Redirects**:
   - Implement redirects from old timecard URLs
   - Maintain existing bookmarks where possible
   - Provide clear migration messaging

2. **API Compatibility**:
   - Maintain existing API endpoints during transition
   - Implement feature flags for gradual rollout
   - Ensure existing functionality remains intact

### Rollout Plan

1. **Phase 1**: Deploy with feature flag disabled
2. **Phase 2**: Enable for admin users only
3. **Phase 3**: Full rollout to all users
4. **Phase 4**: Remove old code and feature flags

This design provides a comprehensive foundation for implementing project-based timecard navigation while maintaining the existing functionality and user experience that users are familiar with.