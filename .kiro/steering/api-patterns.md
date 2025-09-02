---
inclusion: always
---

# API Patterns & Integration Guidelines

## Supabase Client Configuration

### Authentication Integration
- Use Supabase Auth with server-side user validation via `getUser()`
- Implement comprehensive middleware for route protection based on system and project roles
- Handle session refresh automatically with proper error boundaries
- Store user context in React Context with role-based navigation
- Automatic profile creation via database triggers on user registration

### Database Operations
```typescript
// Preferred pattern for data fetching with RLS
const { data, error } = await supabase
  .from('talent_roster')
  .select('*, assigned_escort:users(*)')
  .eq('project_id', projectId)
  .order('name');
```

## API Route Patterns

### Next.js API Routes Structure
```
/app/api/
├── auth/
│   ├── register/route.ts
│   └── profile/route.ts
├── projects/
│   ├── route.ts (GET: list, POST: create)
│   └── [id]/
│       ├── route.ts (GET: details, PUT: update)
│       ├── activate/route.ts
│       ├── checklist/route.ts
│       ├── role-templates/
│       │   ├── route.ts
│       │   └── [templateId]/route.ts
│       ├── team-assignments/
│       │   ├── route.ts
│       │   └── [assignmentId]/route.ts
│       ├── available-staff/route.ts
│       ├── locations/route.ts
│       ├── statistics/route.ts
│       ├── live-status/route.ts
│       └── staff-status/route.ts
└── notifications/
    └── send-email/route.ts
```

### Error Handling Standards
```typescript
// Consistent error response format with detailed error codes
export async function POST(request: Request) {
  try {
    // Get authenticated user from middleware headers or Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Validate request data with Zod
    const validationResult = schema.safeParse(await request.json())
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    // API logic
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

## Real-time Data Patterns

### Supabase Realtime Subscriptions
```typescript
// Talent location updates
const subscription = supabase
  .channel('talent-locations')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'talent_roster',
    filter: `project_id=eq.${projectId}`
  }, handleLocationUpdate)
  .subscribe();
```

### WebSocket Management
- Establish connections on component mount
- Clean up subscriptions on unmount
- Handle connection drops with automatic reconnection
- Batch updates to prevent UI thrashing

## Data Fetching Strategies

### Server Components (Default)
- Use for initial page loads and SEO-critical content
- Fetch data directly in server components when possible
- Leverage Next.js caching for performance

### Client-side Fetching
- Use React Query/SWR for client-side data management
- Implement optimistic updates for time tracking actions
- Cache frequently accessed data (user profile, project settings)

### Hybrid Approach with Authentication
```typescript
// Server component with authentication check
export default async function ProjectPage({ params }: { params: { id: string } }) {
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

  // Server-side authentication and data fetching
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const initialProject = await getProjectDetails(params.id, supabase)
  
  return (
    <ProjectDetailLayout 
      projectId={params.id}
      initialData={initialProject}
    />
  )
}

// Client component with real-time updates and role-based features
function ProjectDetailLayout({ projectId, initialData }: Props) {
  const { userProfile } = useAuth()
  const [project, setProject] = useState(initialData)
  
  // Role-based feature access
  const canEditProject = userProfile?.role ? hasAdminAccess(userProfile.role) : false
  
  // Real-time subscription logic
  useEffect(() => {
    const subscription = supabase
      .channel(`project-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`
      }, handleProjectUpdate)
      .subscribe()

    return () => subscription.unsubscribe()
  }, [projectId])
}
```

## Notification System Integration

### Push Notification Flow
1. **Registration**: Service worker registers for push notifications
2. **Subscription**: Store push subscription in user profile
3. **Trigger**: Server-side events trigger notification sends
4. **Delivery**: Web Push API delivers to registered devices

### Email Integration
- Use Supabase Edge Functions for email sending
- Template-based emails with dynamic content
- Delivery tracking and retry logic for failed sends
- Unsubscribe handling and preference management

## File Upload Patterns

### Profile Pictures & Documents
```typescript
// Supabase Storage integration
const uploadFile = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  return data;
};
```

### CSV Import Processing
- Client-side parsing with Papa Parse
- Validation before server submission
- Progress indicators for large files
- Error reporting with line-by-line feedback