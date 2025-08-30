# Authentication Component Tests

This directory contains comprehensive tests for all authentication-related components in the Talent Tracker application.

## Test Coverage

### Unit Tests

#### Form Components
- **LoginForm** (`login-form.test.tsx`)
  - Form rendering and field validation
  - Password visibility toggle
  - Form submission and error handling
  - Loading states and accessibility

- **RegistrationForm** (`registration-form.test.tsx`)
  - Complete form validation for all fields
  - Password strength indicator
  - Terms agreement requirement
  - Real-time validation feedback

- **AuthCard** (`auth-card.test.tsx`)
  - Layout and styling consistency
  - Responsive design classes
  - Props handling

#### Page Components
- **PendingApprovalPage** (`pending-approval-page.test.tsx`)
  - Pending status display
  - Sign out functionality
  - Loading states and error handling

#### Route Protection
- **ProtectedRoute** (`protected-route.test.tsx`)
  - Authentication state handling
  - Role-based access control
  - Redirect logic for different user states
  - Loading state management

#### Admin Components
- **PendingUsersTable** (`pending-users-table.test.tsx`)
  - User list display and selection
  - Bulk approval functionality
  - Empty state handling

- **ApprovalConfirmationDialog** (`approval-confirmation-dialog.test.tsx`)
  - Single and bulk user approval dialogs
  - Loading states and error handling
  - Accessibility features

### Integration Tests

#### Complete Workflows (`auth-integration.test.tsx`)
- **Registration Flow**
  - End-to-end registration process
  - Error handling and validation
  - Success state management

- **Login Flow**
  - Complete authentication workflow
  - Error recovery and retry logic
  - Session management

- **Route Protection Integration**
  - Authentication state changes
  - Redirect behavior
  - Role-based access

- **Form Validation Integration**
  - Progressive validation
  - Cross-field dependencies
  - Real-time feedback

- **Accessibility Integration**
  - Keyboard navigation
  - Screen reader support
  - Focus management

### Validation Tests

#### Schema Validation (`lib/__tests__/auth-validation.test.ts`)
- **Registration Schema**
  - Name validation (letters, hyphens, apostrophes)
  - Email format and length validation
  - Password strength requirements
  - Phone number formatting
  - Location field validation
  - Terms agreement requirement

- **Login Schema**
  - Email validation
  - Password requirement
  - Case normalization

- **Password Strength Function**
  - Weak, medium, and strong password detection
  - Character type requirements
  - Edge case handling

## Test Setup

### Dependencies
- **Vitest** - Test runner
- **@testing-library/react** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - DOM assertion matchers

### Mocks
- **ResizeObserver** - For Radix UI components
- **Next.js Router** - Navigation mocking
- **Supabase Client** - Database operations
- **Toast Notifications** - User feedback
- **Auth Context** - Authentication state

### Configuration
- **vitest.config.ts** - Test environment setup
- **test-setup.ts** - Global mocks and utilities

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- components/auth/__tests__/login-form.test.tsx

# Run tests with coverage
npm run test -- --coverage
```

## Test Patterns

### Component Testing
- Render components with required props
- Test user interactions with userEvent
- Assert on DOM changes and state updates
- Mock external dependencies

### Form Testing
- Test validation rules and error messages
- Simulate user input and form submission
- Verify loading and success states
- Test accessibility features

### Integration Testing
- Test complete user workflows
- Verify component interactions
- Test error recovery scenarios
- Validate accessibility compliance

## Coverage Requirements

All authentication components should have:
- ✅ Unit tests for core functionality
- ✅ Integration tests for user workflows
- ✅ Validation tests for form schemas
- ✅ Accessibility tests for screen readers
- ✅ Error handling tests for edge cases

## Maintenance

When adding new authentication features:
1. Add corresponding unit tests
2. Update integration tests if workflows change
3. Add validation tests for new schemas
4. Ensure accessibility compliance
5. Update this documentation

## Known Issues

- Some tests may show warnings about React refs in Radix UI components (non-breaking)
- Date formatting in tests may vary by locale (handled with flexible matchers)
- ResizeObserver mock required for Radix UI components in test environment