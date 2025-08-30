---
inclusion: always
---

# API Patterns & Integration Guidelines

## Supabase Client Configuration

### Authentication Integration
- Use Supabase Auth with custom claims for role-based access
- Implement middleware for route protection based on project roles
- Handle session refresh automatically with proper error boundaries
- Store user context in React Context for global access

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
│   └── approve-users/route.ts
├── projects/
│   ├── [id]/
│   │   ├── talent/route.ts
│   │   └── timecards/route.ts
├── notifications/
│   └── send-email/route.ts
└── time-tracking/
    ├── check-in/route.ts
    └── submit-timecard/route.ts
```

### Error Handling Standards
```typescript
// Consistent error response format
export async function POST(request: Request) {
  try {
    // API logic
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
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

### Hybrid Approach
```typescript
// Server component for initial data
export default async function TalentPage({ params }: { params: { id: string } }) {
  const initialTalent = await getTalentRoster(params.id);
  
  return (
    <TalentManager 
      initialData={initialTalent}
      projectId={params.id}
    />
  );
}

// Client component for real-time updates
function TalentManager({ initialData, projectId }: Props) {
  const { data: talent } = useTalentRoster(projectId, { initialData });
  // Real-time subscription logic
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