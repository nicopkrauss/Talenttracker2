---
inclusion: always
---

# Talent Tracker - Project Overview & Direction

## Vision & Purpose
Talent Tracker is a comprehensive operational management tool for live productions, designed as a Progressive Web App (PWA) to serve as the single "source of truth" for live event producers. The application manages projects, staff teams, talent logistics in real-time, and handles team timekeeping and payroll data efficiently.

## Core Architecture Principles
- **Platform**: Progressive Web App (PWA) using React/Next.js
- **Responsive Design**: Must adapt seamlessly between mobile and desktop contexts
- **Backend**: Supabase (PostgreSQL, Authentication, serverless functions)
- **Security**: All PII encrypted in transit (HTTPS) and at rest
- **Real-time**: Push notifications via Web Push APIs
- **Single Codebase**: Cross-platform compatibility from one codebase

## Key User Roles & Permissions
The system operates on a project-based role assignment model:

### Admin
- System Owner with full access
- Manages projects, approves timecards, full talent management
- Can initiate daily checkout for escorts

### In-House
- System Manager with configurable permissions
- Full talent management, configurable checkout and approval rights

### Supervisor
- On-site Manager tracking day rate time
- Full talent management, configurable checkout initiation
- Cannot approve timecards or manage projects

### Talent Logistics Coordinator (TLC)
- Informational oversight role with day rate tracking
- Full talent management, no checkout initiation

### Talent Escort
- On-the-ground operator with hourly time tracking
- Restricted talent management (assigned talent only)
- Cannot initiate checkout or approve timecards

## Development Priorities
1. **Mobile-First Design**: Primary interface is mobile dock navigation
2. **Real-time Operations**: Live talent tracking and location updates
3. **Streamlined Time Tracking**: One-button check-in/break/checkout workflow
4. **Approval Workflows**: Secure user onboarding and timecard approval
5. **Notification System**: Proactive alerts for operational needs