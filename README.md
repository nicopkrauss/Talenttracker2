# Talent Tracker

A comprehensive operational management tool for live productions, built as a Progressive Web App (PWA) to serve as the single "source of truth" for live event producers.

## Overview

Talent Tracker manages projects, staff teams, talent logistics in real-time, and handles team timekeeping and payroll data efficiently. The application is designed with a mobile-first approach and provides role-based access control for different user types.

## Technology Stack

- **Frontend**: Next.js with React (App Router), TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Schema Management**: Prisma for type generation
- **Testing**: Vitest + React Testing Library

## Key Features

### User Roles & Permissions
- **Admin**: System owner with full access
- **In-House**: System manager with configurable permissions
- **Supervisor**: On-site manager with day rate tracking
- **Coordinator**: Informational oversight role
- **Talent Escort**: On-the-ground operator with hourly tracking

### Core Functionality
- **Project Management**: Lifecycle management from prep to active to archived
- **Team Management**: Role-based assignments with pay rate overrides
- **Talent Management**: Enhanced profiles with representative information
- **Time Tracking**: Universal time tracking flow for all roles
- **Real-time Updates**: Live talent location and status tracking
- **Approval Workflows**: User onboarding and timecard approval systems

## Project Structure

```
├── app/                    # Next.js app router pages and API routes
├── components/            # Reusable UI components organized by domain
├── lib/                   # Utility functions, database helpers, auth logic
├── hooks/                 # Custom React hooks
├── data/                  # Data files and samples
│   └── samples/          # Sample CSV/Excel files for testing
├── docs/                  # Technical documentation
├── migrations/           # Database migration files
│   └── archive/         # Archived migration files
├── scripts/             # Utility scripts organized by category
│   ├── database/        # Database management scripts
│   ├── utilities/       # Build and optimization scripts
│   └── development/     # Development helper scripts
├── summaries/           # Implementation summaries
│   └── archive/         # Archived development summaries
├── tests/               # Test files
└── .kiro/              # Kiro AI assistant configuration
    └── steering/       # Development standards and guidelines
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd talent-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

The application uses Supabase as the backend. Database schema is managed through Prisma and SQL migrations.

1. Set up your Supabase project
2. Run the database migrations (see `migrations/README.md`)
3. Generate Prisma client:
```bash
npx prisma generate
```

## Development

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- Comprehensive error handling and validation
- Mobile-first responsive design
- WCAG 2.1 AA accessibility compliance

### Testing
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

### Building for Production
```bash
npm run build
npm start
```

## Documentation

- [Development Standards](.kiro/steering/development-standards.md)
- [API Patterns](.kiro/steering/api-patterns.md)
- [Database Patterns](.kiro/steering/database-patterns.md)
- [UI/UX Standards](.kiro/steering/ui-ux-standards.md)
- [Workflow Patterns](.kiro/steering/workflow-patterns.md)

## Contributing

1. Follow the established code standards and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure accessibility compliance
5. Test on both mobile and desktop

## License

[License information to be added]