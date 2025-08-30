# Authentication UI Design Document

## Overview

The authentication UI system provides a complete user registration, login, and approval workflow that integrates seamlessly with the existing Talent Tracker application. The design leverages the established shadcn/ui design system and follows the same clean, card-based layout patterns used throughout the application, particularly matching the talent page design aesthetic.

## Architecture

### Component Structure
```
AuthenticationProvider (Context)
├── PublicLayout (Wrapper for auth pages)
├── LoginPage
│   ├── LoginForm
│   └── AuthCard (Shared wrapper)
├── RegisterPage
│   ├── RegistrationForm
│   └── AuthCard (Shared wrapper)
├── PendingApprovalPage
│   └── StatusMessage
└── AdminApprovalQueue (Team module integration)
    ├── PendingUsersTable
    └── BulkApprovalActions
```

### Authentication Flow
1. **Public Access**: Unauthenticated users can access login and registration pages
2. **Registration**: New users complete registration form and enter pending state
3. **Pending State**: Users with pending status see blocking message until approved
4. **Admin Approval**: Admins can view and bulk-approve pending users
5. **Active Access**: Approved users can access the full application

### Route Protection
- **Public Routes**: `/login`, `/register`, `/terms`, `/privacy`
- **Pending Route**: `/pending` (for users awaiting approval)
- **Protected Routes**: All other routes require approved user status
- **Admin Routes**: Team module approval queue requires admin/in-house role

## Components and Interfaces

### Core Authentication Types
```typescript
interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    avatar_url?: string
  }
}

interface UserProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string
  state: string
  role: ProjectRole
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

interface RegistrationData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  city: string
  state: string
  agreeToTerms: boolean
}

interface LoginData {
  email: string
  password: string
}
```

### Authentication Context
```typescript
interface AuthContextType {
  user: AuthUser | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (data: LoginData) => Promise<void>
  signUp: (data: RegistrationData) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
```

### Form Components Design

#### AuthCard Component
- **Purpose**: Shared wrapper for all authentication forms
- **Design**: Centered card with consistent padding and styling
- **Layout**: Max width 400px, centered on screen with subtle shadow
- **Responsive**: Full width on mobile with appropriate margins

#### LoginForm Component
- **Fields**: Email (required), Password (required)
- **Validation**: Real-time validation with error states
- **Actions**: Login button, "Register" link
- **Error Handling**: Display authentication errors below form
- **Loading State**: Disabled form with loading spinner on submit

#### RegistrationForm Component
- **Fields**: 
  - Full Name (split into first/last name)
  - Email (with validation)
  - Password (with strength indicator)
  - Phone Number (formatted input)
  - Location (City, State as separate fields)
  - Terms Agreement (checkbox with linked text)
- **Validation**: Progressive validation with helpful error messages
- **Actions**: Register button, "Login" link
- **Success State**: Redirect to pending approval page

### Page Layouts

#### Login Page (`/login`)
```
┌─────────────────────────────────────┐
│              Logo/Title             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │         Login Form          │   │
│  │  ┌─────────────────────┐   │   │
│  │  │      Email          │   │   │
│  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │   │
│  │  │      Password       │   │   │
│  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │   │
│  │  │    Login Button     │   │   │
│  │  └─────────────────────┘   │   │
│  │                             │   │
│  │   Need an account? Register │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### Registration Page (`/register`)
```
┌─────────────────────────────────────┐
│              Logo/Title             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Registration Form      │   │
│  │  ┌─────────────────────┐   │   │
│  │  │    First Name       │   │   │
│  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │   │
│  │  │    Last Name        │   │   │
│  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │   │
│  │  │      Email          │   │   │
│  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │   │
│  │  │      Password       │   │   │
│  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │   │
│  │  │      Phone          │   │   │
│  │  └─────────────────────┘   │   │
│  │  ┌──────────┬──────────┐   │   │
│  │  │   City   │  State   │   │   │
│  │  └──────────┴──────────┘   │   │
│  │  ☐ I agree to Terms &      │   │
│  │     Privacy Policy          │   │
│  │  ┌─────────────────────┐   │   │
│  │  │   Register Button   │   │   │
│  │  └─────────────────────┘   │   │
│  │                             │   │
│  │   Have an account? Login    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### Pending Approval Page (`/pending`)
```
┌─────────────────────────────────────┐
│                                     │
│              Logo/Title             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │    ⏳ Account Pending       │   │
│  │                             │   │
│  │  Your account has been      │   │
│  │  created and is awaiting    │   │
│  │  approval from an           │   │
│  │  administrator. You will    │   │
│  │  be notified when your      │   │
│  │  account is active.         │   │
│  │                             │   │
│  │  ┌─────────────────────┐   │   │
│  │  │    Sign Out         │   │   │
│  │  └─────────────────────┘   │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Data Models

### Database Schema Extensions
```sql
-- User profiles table (extends existing)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
```

### Validation Schemas
```typescript
const registrationSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  
  email: z.string()
    .email("Please enter a valid email address")
    .toLowerCase(),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      "Password must contain uppercase, lowercase, and number"),
  
  phone: z.string()
    .regex(/^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/, 
      "Please enter a valid phone number"),
  
  city: z.string()
    .min(1, "City is required")
    .max(100, "City must be 100 characters or less"),
  
  state: z.string()
    .min(2, "State is required")
    .max(50, "State must be 50 characters or less"),
  
  agreeToTerms: z.boolean()
    .refine(val => val === true, "You must agree to the terms and conditions")
})

const loginSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .toLowerCase(),
  
  password: z.string()
    .min(1, "Password is required")
})
```

## Error Handling

### Authentication Errors
- **Invalid Credentials**: "Invalid email or password. Please try again."
- **Email Already Exists**: "An account with this email already exists. Please login instead."
- **Network Errors**: "Connection error. Please check your internet and try again."
- **Server Errors**: "Something went wrong. Please try again later."

### Validation Errors
- **Real-time Validation**: Show errors as user types (debounced)
- **Form Submission**: Prevent submission with validation errors
- **Field-specific**: Display errors directly below each field
- **Summary**: Show general form errors at the top

### Route Protection Errors
- **Unauthorized Access**: Redirect to login with message
- **Pending Status**: Redirect to pending approval page
- **Session Expired**: Clear session and redirect to login

## Testing Strategy

### Unit Tests
- **Form Validation**: Test all validation rules and error messages
- **Authentication Flow**: Test login, registration, and logout
- **Error Handling**: Test error states and recovery
- **Component Rendering**: Test all authentication components

### Integration Tests
- **End-to-End Registration**: Complete registration flow
- **Login Flow**: Test successful and failed login attempts
- **Route Protection**: Test access control for different user states
- **Admin Approval**: Test approval workflow from admin perspective

### Accessibility Tests
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: Proper ARIA labels and announcements
- **Form Labels**: All inputs properly labeled
- **Error Announcements**: Screen reader error feedback

### Security Tests
- **Password Handling**: Ensure passwords are properly masked and transmitted
- **Session Management**: Test session security and expiration
- **Input Sanitization**: Test against XSS and injection attacks
- **Rate Limiting**: Test protection against brute force attacks

## Implementation Notes

### Existing Dependencies
- **Supabase Auth**: Leverage existing authentication setup
- **shadcn/ui**: Use existing form, input, button, and card components
- **React Hook Form**: For form state management and validation
- **Zod**: For schema validation
- **Next.js**: For routing and SSR considerations

### Security Considerations
- **Password Requirements**: Enforce strong password policy
- **Rate Limiting**: Implement login attempt limits
- **CSRF Protection**: Use Supabase's built-in CSRF protection
- **Secure Headers**: Implement security headers for auth pages
- **Session Security**: Proper session management and expiration

### Performance Optimizations
- **Code Splitting**: Lazy load authentication components
- **Form Optimization**: Debounced validation to reduce API calls
- **Caching**: Cache user profile data appropriately
- **Bundle Size**: Tree-shake unused authentication features

### Responsive Design
- **Mobile First**: Design for mobile with desktop enhancements
- **Touch Targets**: Ensure buttons meet minimum touch target sizes
- **Viewport**: Proper viewport handling for mobile devices
- **Keyboard**: Full keyboard support for desktop users