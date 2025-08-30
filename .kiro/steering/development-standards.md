---
inclusion: always
---

# Development Standards & Technical Guidelines

## Technology Stack Requirements

### Frontend
- **Framework**: Next.js with React (App Router)
- **Styling**: Tailwind CSS with shadcn/ui components
- **TypeScript**: Strict mode enabled for type safety
- **PWA**: Service worker implementation for offline capability
- **State Management**: React Context + hooks for local state, Zustand for global state

### Backend & Database
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **ORM**: Prisma for type-safe database operations and schema management
- **Authentication**: Supabase Auth with role-based access control
- **API**: Supabase client with TypeScript types + Prisma Client
- **Real-time**: Supabase Realtime for live updates
- **File Storage**: Supabase Storage for profile pictures and documents

## Code Organization Patterns

### File Structure
```
/app - Next.js app router pages
/components - Reusable UI components organized by domain
/lib - Utility functions, database helpers, auth logic
/hooks - Custom React hooks
/types - TypeScript type definitions
/middleware.ts - Auth and routing middleware
```

### Component Architecture
- **Atomic Design**: Atoms (ui components) → Molecules → Organisms → Pages
- **Domain Separation**: Auth, Talent, Timecards, Projects modules
- **Composition over Inheritance**: Prefer composition patterns
- **Error Boundaries**: Wrap major sections with error handling

## Security & Data Protection

### Authentication Flow
- Public registration with admin approval workflow
- JWT tokens with role-based claims
- Protected routes with middleware validation
- Session management with automatic refresh

### Data Security
- All PII encrypted at rest and in transit
- Row Level Security policies for multi-tenant data
- Input validation and sanitization
- CSRF protection on all forms

## Performance Standards

### Core Web Vitals Targets
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)  
- **CLS**: < 0.1 (Cumulative Layout Shift)

### Optimization Strategies
- Code splitting by route and feature
- Image optimization with Next.js Image component
- Lazy loading for non-critical components
- Database query optimization with proper indexing

## Testing Requirements

### Test Coverage
- Unit tests for utility functions and hooks
- Integration tests for auth flows and API routes
- Component tests for critical UI interactions
- E2E tests for complete user workflows

### Testing Tools
- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright for cross-browser testing
- **Database**: Test database with Prisma seed data and migrations
- **Mocking**: MSW for API mocking in tests
- **Database Testing**: Prisma test environment with isolated transactions