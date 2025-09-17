# Phase Engine Client-Server Separation Fix

## Problem
The application was throwing an error on load:
```
Error: ./lib/services/phase-engine.ts
Error: You're importing a component that needs "next/headers". That only works in a Server Component which is not supported in the pages/ directory.
```

This occurred because the `phase-engine.ts` file was importing `next/headers` (server-side only) but was being used in client-side components through the `ProjectPhase` enum import.

## Root Cause
- `lib/services/phase-engine.ts` imports `next/headers` and `@supabase/ssr` for server-side functionality
- Client-side components were importing `ProjectPhase` enum from this server-side file
- Next.js detected the server-side imports and threw an error when trying to use them on the client

## Solution
Created a separation between client-safe types and server-side implementation:

### 1. Created `lib/types/project-phase.ts`
- Contains only client-safe types and enums
- No server-side imports
- Includes:
  - `ProjectPhase` enum
  - `TransitionResult` interface
  - `PhaseConfiguration` interface
  - `PHASE_DISPLAY_NAMES` constant
  - `PHASE_COLORS` constant

### 2. Updated `lib/services/phase-engine.ts`
- Imports types from the new client-safe file
- Re-exports types for backward compatibility
- Removed duplicate type definitions
- Keeps server-side functionality intact

### 3. Updated All Import Statements
Updated 15+ files to import phase types from the new location:
- `hooks/use-phase-feature-availability.ts`
- `hooks/use-project-phase-mode.ts`
- `components/projects/phase-specific-dashboard.tsx`
- `components/projects/phase-aware-empty-state.tsx`
- `components/projects/project-detail-layout.tsx`
- All test files
- All component files using phase types

## Files Changed
- **Created**: `lib/types/project-phase.ts`
- **Modified**: `lib/services/phase-engine.ts` (removed duplicate types, added re-exports)
- **Updated**: 15+ component and hook files to use new import paths

## Benefits
1. **Fixes the Import Error**: Client components can now safely import phase types
2. **Maintains Backward Compatibility**: Server-side code still works unchanged
3. **Better Architecture**: Clear separation between client-safe types and server-side logic
4. **No Breaking Changes**: All existing functionality preserved

## Testing
- All existing tests pass (15/15 test cases)
- Application loads without errors
- Phase-specific feature availability works correctly
- Server-side phase engine functionality remains intact

## Import Guidelines
- **Client-side components**: Import from `@/lib/types/project-phase`
- **Server-side code**: Can import from either location (backward compatible)
- **API routes**: Continue importing from `@/lib/services/phase-engine` for full functionality

This fix ensures that the phase-specific feature availability system works correctly while maintaining the separation between client and server code that Next.js requires.