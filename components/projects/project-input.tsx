"use client"

import React, { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ProjectInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  success?: boolean
}

interface ProjectTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  success?: boolean
}

export const ProjectInput = forwardRef<HTMLInputElement, ProjectInputProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // Base styles from shadcn Input component
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          // Error state
          error && "border-destructive focus-visible:ring-destructive",
          // Success state
          success && "border-white focus-visible:ring-white dark:border-white dark:focus-visible:ring-white",
          className
        )}
        {...props}
      />
    )
  }
)

ProjectInput.displayName = "ProjectInput"

export const ProjectTextarea = forwardRef<HTMLTextAreaElement, ProjectTextareaProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          // Base styles from shadcn Textarea component
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          // Error state
          error && "border-destructive focus-visible:ring-destructive",
          // Success state
          success && "border-white focus-visible:ring-white dark:border-white dark:focus-visible:ring-white",
          className
        )}
        {...props}
      />
    )
  }
)

ProjectTextarea.displayName = "ProjectTextarea"

// Date input component with validation styling
interface ProjectDateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  success?: boolean
}

export const ProjectDateInput = forwardRef<HTMLInputElement, ProjectDateInputProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="date"
        className={cn(
          // Base styles
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          // Error state
          error && "border-destructive focus-visible:ring-destructive",
          // Success state
          success && "border-white focus-visible:ring-white dark:border-white dark:focus-visible:ring-white",
          className
        )}
        {...props}
      />
    )
  }
)

ProjectDateInput.displayName = "ProjectDateInput"