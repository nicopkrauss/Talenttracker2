import * as React from "react"
import { cn } from "@/lib/utils"

interface PublicLayoutProps {
  children: React.ReactNode
  className?: string
}

export function PublicLayout({ children, className }: PublicLayoutProps) {
  return (
    <div 
      className={cn(
        // Base layout matching talent page patterns
        "min-h-screen bg-gradient-to-br from-background via-background to-muted/20",
        "flex flex-col",
        // Smooth transitions
        "transition-colors duration-300 ease-in-out",
        className
      )}
    >
      {/* Enhanced header with better typography and spacing */}
      <header className="flex-shrink-0 p-6 text-center border-b border-border/40">
        <div className="max-w-4xl mx-auto">
          <h1 className={cn(
            "text-3xl font-bold text-foreground",
            "tracking-tight",
            // Responsive typography
            "sm:text-4xl",
            // Smooth transitions
            "transition-all duration-200 ease-in-out"
          )}>
            Talent Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            Professional Talent Management System
          </p>
        </div>
      </header>

      {/* Enhanced main content area with optimized spacing */}
      <main className={cn(
        "flex-1 flex items-center justify-center",
        "px-4 py-4",
        // Reduced responsive spacing to prevent unnecessary scrolling
        "sm:px-6 sm:py-6 md:px-8 md:py-8",
        // Smooth transitions
        "transition-all duration-200 ease-in-out"
      )}>
        <div className="w-full max-w-sm sm:max-w-md">
          {children}
        </div>
      </main>

      {/* Enhanced footer with better styling */}
      <footer className={cn(
        "flex-shrink-0 p-6 text-center",
        "border-t border-border/40 bg-muted/30",
        "transition-colors duration-300 ease-in-out"
      )}>
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground font-medium">
            &copy; 2024 Talent Tracker. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}