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
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) and custom triggers
- **Schema Management**: Prisma for type generation and schema introspection
- **Authentication**: Supabase Auth with server-side validation and automatic profile creation
- **API**: Supabase client with TypeScript types and comprehensive error handling
- **Real-time**: Supabase Realtime for live talent tracking and project updates
- **Notifications**: Email notification system with delivery tracking
- **File Storage**: Supabase Storage for profile pictures and documents

## Code Organization Patterns

### File Structure
```
/app - Next.js app router pages and API routes
/components - Reusable UI components organized by domain (auth, projects, talent, navigation)
/lib - Utility functions, database helpers, auth logic, role utilities
/hooks - Custom React hooks (use-auth, use-navigation, use-form-validation)
/scripts - Database migration and utility scripts
/migrations - SQL migration files for database schema changes
/docs - Technical documentation and guides
/.kiro/steering - Project steering documentation and standards
/middleware.ts - Comprehensive auth and routing middleware with role-based protection
```

### Component Architecture
- **Atomic Design**: Atoms (ui components) → Molecules → Organisms → Pages
- **Domain Separation**: Auth, Talent, Timecards, Projects modules
- **Composition over Inheritance**: Prefer composition patterns
- **Error Boundaries**: Wrap major sections with error handling

## Security & Data Protection

### Authentication Flow
- Public registration with role selection and admin approval workflow
- Supabase Auth with server-side user validation via `getUser()`
- Comprehensive middleware with role-based route protection
- Automatic profile creation via database triggers
- Session management with automatic refresh and proper error handling

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