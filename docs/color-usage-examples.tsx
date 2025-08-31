/**
 * Color Usage Examples
 * 
 * This file demonstrates proper theme-aware color usage patterns
 * for common UI components in the Talent Tracker application.
 * 
 * Use these examples as reference when migrating components
 * from hardcoded colors to theme-aware alternatives.
 */

import React from 'react';

// ============================================================================
// BASIC TEXT AND BACKGROUND PATTERNS
// ============================================================================

export const BasicTextExamples = () => {
  return (
    <div className="space-y-4">
      {/* Primary text - use for headings and main content */}
      <h1 className="text-2xl font-bold text-foreground">
        Main Heading (Primary Text)
      </h1>
      
      {/* Secondary text - use for descriptions and helper text */}
      <p className="text-muted-foreground">
        This is secondary text used for descriptions and less important content.
      </p>
      
      {/* Text on colored backgrounds */}
      <div className="bg-primary text-primary-foreground p-4 rounded">
        Text on colored background uses primary-foreground for contrast
      </div>
    </div>
  );
};

export const BasicBackgroundExamples = () => {
  return (
    <div className="bg-background min-h-screen">
      {/* Main background - use for page backgrounds */}
      <div className="bg-background p-6">
        <h2 className="text-foreground mb-4">Page Background</h2>
        
        {/* Card backgrounds */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h3 className="text-card-foreground font-medium">Card Background</h3>
          <p className="text-muted-foreground">Card content with proper contrast</p>
        </div>
        
        {/* Muted backgrounds for sections */}
        <div className="bg-muted p-4 rounded">
          <p className="text-foreground">Muted background for subtle sections</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SEMANTIC COLOR PATTERNS (SUCCESS, WARNING, ERROR, INFO)
// ============================================================================

export const SemanticColorExamples = () => {
  return (
    <div className="space-y-6">
      {/* Success States */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">Success States</h3>
        
        {/* Success text */}
        <p className="text-green-600 dark:text-green-400">
          ✓ Project created successfully
        </p>
        
        {/* Success alert */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="text-green-700 dark:text-green-300 font-medium mb-1">
            Success!
          </h4>
          <p className="text-green-600 dark:text-green-400">
            Your changes have been saved successfully.
          </p>
        </div>
      </div>

      {/* Warning States */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">Warning States</h3>
        
        {/* Warning text */}
        <p className="text-amber-600 dark:text-amber-400">
          ⚠ Please review your timecard before submitting
        </p>
        
        {/* Warning alert */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="text-amber-700 dark:text-amber-300 font-medium mb-1">
            Warning
          </h4>
          <p className="text-amber-600 dark:text-amber-400">
            This action cannot be undone. Please confirm before proceeding.
          </p>
        </div>
      </div>

      {/* Error States */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">Error States</h3>
        
        {/* Error text */}
        <p className="text-red-600 dark:text-red-400">
          ✗ Failed to save changes
        </p>
        
        {/* Error alert */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="text-red-700 dark:text-red-300 font-medium mb-1">
            Error
          </h4>
          <p className="text-red-600 dark:text-red-400">
            Please check your input and try again.
          </p>
        </div>
      </div>

      {/* Info States */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">Info States</h3>
        
        {/* Info text */}
        <p className="text-blue-600 dark:text-blue-400">
          ℹ New features available in this update
        </p>
        
        {/* Info alert */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-blue-700 dark:text-blue-300 font-medium mb-1">
            Information
          </h4>
          <p className="text-blue-600 dark:text-blue-400">
            Learn about the latest features and improvements.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FORM COMPONENT PATTERNS
// ============================================================================

export const FormExamples = () => {
  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg font-medium text-foreground">Form Components</h3>
      
      {/* Text Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Project Name
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          placeholder="Enter project name"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Choose a descriptive name for your project
        </p>
      </div>

      {/* Select Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Project Status
        </label>
        <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20">
          <option value="">Select status</option>
          <option value="prep">Preparation</option>
          <option value="active">Active</option>
        </select>
      </div>

      {/* Textarea */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
          placeholder="Describe your project"
        />
      </div>

      {/* Form validation states */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Email (with error)
        </label>
        <input
          type="email"
          className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:border-red-500 dark:focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-400/20"
          placeholder="Enter email"
        />
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          Please enter a valid email address
        </p>
      </div>

      {/* Buttons */}
      <div className="flex space-x-3">
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
          Save Project
        </button>
        <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// NAVIGATION PATTERNS
// ============================================================================

export const NavigationExamples = () => {
  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">
            Talent Tracker
          </h1>
          
          <div className="flex space-x-6">
            <a
              href="/projects"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Projects
            </a>
            <a
              href="/talent"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Talent
            </a>
            <a
              href="/team"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Team
            </a>
          </div>
        </div>
      </nav>

      {/* Sidebar Navigation */}
      <div className="flex">
        <aside className="w-64 bg-muted border-r border-border p-4">
          <nav className="space-y-2">
            <a
              href="/dashboard"
              className="flex items-center px-3 py-2 text-sm font-medium text-foreground bg-primary/10 rounded-md"
            >
              Dashboard
            </a>
            <a
              href="/projects"
              className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Projects
            </a>
            <a
              href="/talent"
              className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Talent Management
            </a>
          </nav>
        </aside>
        
        <main className="flex-1 bg-background p-6">
          <h2 className="text-2xl font-bold text-foreground">Main Content</h2>
          <p className="text-muted-foreground">Content area with proper theming</p>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="bg-card border-t border-border">
        <div className="flex justify-around py-2">
          {['Projects', 'Team', 'Talent', 'Profile'].map((item, index) => (
            <button
              key={item}
              className={`flex flex-col items-center py-2 px-3 rounded-md transition-colors ${
                index === 0
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <div className="w-6 h-6 mb-1 bg-current rounded opacity-60" />
              <span className="text-xs font-medium">{item}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STATUS AND BADGE PATTERNS
// ============================================================================

export const StatusBadgeExamples = () => {
  const StatusBadge = ({ 
    status, 
    children 
  }: { 
    status: 'active' | 'pending' | 'error' | 'success'; 
    children: React.ReactNode;
  }) => {
    const statusStyles = {
      active: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      pending: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      error: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      success: 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
        {children}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-foreground">Status Badges</h3>
      
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="active">Active</StatusBadge>
        <StatusBadge status="pending">Pending</StatusBadge>
        <StatusBadge status="error">Error</StatusBadge>
        <StatusBadge status="success">Success</StatusBadge>
      </div>

      {/* Progress indicators */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Progress Indicators</h4>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }} />
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-green-500 dark:bg-green-400 h-2 rounded-full" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CARD AND LAYOUT PATTERNS
// ============================================================================

export const CardLayoutExamples = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-foreground">Card Layouts</h3>
      
      {/* Basic Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-medium text-card-foreground mb-2">
          Project Overview
        </h4>
        <p className="text-muted-foreground mb-4">
          Track your project progress and manage team assignments.
        </p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Last updated: 2 hours ago</span>
          <button className="text-primary hover:text-primary/80 text-sm font-medium">
            View Details
          </button>
        </div>
      </div>

      {/* Card with Header */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="bg-muted px-6 py-4 border-b border-border">
          <h4 className="text-lg font-medium text-foreground">Team Members</h4>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {['John Doe', 'Jane Smith', 'Mike Johnson'].map((name) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-foreground">{name}</span>
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <h5 className="font-medium text-card-foreground mb-2">Card {i}</h5>
            <p className="text-sm text-muted-foreground">
              Example card content with proper theme-aware colors.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// INTERACTIVE ELEMENT PATTERNS
// ============================================================================

export const InteractiveExamples = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-foreground">Interactive Elements</h3>
      
      {/* Button Variants */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Button Variants</h4>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors">
            Primary Button
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors">
            Secondary Button
          </button>
          <button className="px-4 py-2 border border-input bg-background text-foreground rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors">
            Outline Button
          </button>
          <button className="px-4 py-2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-md transition-colors">
            Ghost Button
          </button>
        </div>
      </div>

      {/* Links */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Links</h4>
        <div className="space-y-1">
          <a href="#" className="text-primary hover:text-primary/80 underline underline-offset-4">
            Primary Link
          </a>
          <br />
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
            Subtle Link
          </a>
        </div>
      </div>

      {/* Checkboxes and Radio Buttons */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Form Controls</h4>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-input text-primary focus:ring-ring focus:ring-offset-background"
            />
            <span className="text-sm text-foreground">Enable notifications</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="theme"
              className="border-input text-primary focus:ring-ring focus:ring-offset-background"
            />
            <span className="text-sm text-foreground">Light theme</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="theme"
              className="border-input text-primary focus:ring-ring focus:ring-offset-background"
            />
            <span className="text-sm text-foreground">Dark theme</span>
          </label>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPLETE EXAMPLE COMPONENT
// ============================================================================

export const CompleteExampleComponent = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold text-foreground">
              Theme-Aware Component Example
            </h1>
            <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Toggle Theme
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-medium text-card-foreground mb-4">
                Project Dashboard
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Active Projects
                  </h3>
                  <p className="text-2xl font-bold text-foreground">12</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    +2 from last month
                  </p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Team Members
                  </h3>
                  <p className="text-2xl font-bold text-foreground">48</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    3 pending approval
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-foreground">Project "Summer Festival" activated</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                    <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                      Success
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-foreground">New team member added</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                      Info
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-card-foreground mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
                  Create New Project
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
                  Add Team Member
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
                  View Reports
                </button>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="text-amber-700 dark:text-amber-300 font-medium mb-2">
                Reminder
              </h4>
              <p className="text-amber-600 dark:text-amber-400 text-sm">
                Don't forget to review pending timecards before the deadline.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default {
  BasicTextExamples,
  BasicBackgroundExamples,
  SemanticColorExamples,
  FormExamples,
  NavigationExamples,
  StatusBadgeExamples,
  CardLayoutExamples,
  InteractiveExamples,
  CompleteExampleComponent
};