"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "./form"

interface FormFieldWrapperProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * A wrapper component that provides consistent styling for form fields
 * with proper theme-aware error states, focus indicators, and accessibility
 */
export function FormFieldWrapper({
  label,
  description,
  error,
  required = false,
  children,
  className
}: FormFieldWrapperProps) {
  return (
    <FormItem className={cn("space-y-2", className)}>
      {label && (
        <FormLabel className={cn(
          "text-sm font-semibold text-foreground",
          "transition-colors duration-200 ease-in-out",
          error && "text-destructive"
        )}>
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </FormLabel>
      )}
      
      <FormControl>
        <div className={cn(
          "relative",
          "transition-all duration-200 ease-in-out",
          error && "animate-in slide-in-from-left-2 duration-200"
        )}>
          {children}
        </div>
      </FormControl>
      
      {description && (
        <FormDescription className={cn(
          "text-xs text-muted-foreground",
          "transition-colors duration-200 ease-in-out"
        )}>
          {description}
        </FormDescription>
      )}
      
      {error && (
        <FormMessage className={cn(
          "text-xs text-destructive",
          "animate-in slide-in-from-left-2 duration-200",
          "flex items-center gap-1"
        )}>
          <span className="inline-block w-1 h-1 bg-destructive rounded-full" />
          {error}
        </FormMessage>
      )}
    </FormItem>
  )
}

/**
 * Enhanced input component with consistent theme-aware styling
 */
export function ThemedInput({
  className,
  error,
  ...props
}: React.ComponentProps<"input"> & { error?: boolean }) {
  return (
    <input
      className={cn(
        // Base styles with theme awareness
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1",
        "text-base shadow-xs transition-all duration-200 ease-in-out",
        "file:border-0 file:bg-transparent file:text-foreground file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        
        // Focus states with enhanced ring
        "focus-visible:outline-none focus-visible:border-ring",
        "focus-visible:ring-2 focus-visible:ring-ring/20",
        "focus-visible:ring-offset-0",
        
        // Error states with theme awareness
        error && [
          "border-destructive",
          "focus-visible:border-destructive",
          "focus-visible:ring-destructive/20",
          "dark:focus-visible:ring-destructive/40"
        ],
        
        // Disabled states
        "disabled:cursor-not-allowed disabled:opacity-50",
        
        // Dark mode enhancements
        "dark:bg-input/30",
        
        // Mobile optimizations
        "md:text-sm", // Prevent zoom on iOS
        
        className
      )}
      {...props}
    />
  )
}

/**
 * Enhanced textarea component with consistent theme-aware styling
 */
export function ThemedTextarea({
  className,
  error,
  ...props
}: React.ComponentProps<"textarea"> & { error?: boolean }) {
  return (
    <textarea
      className={cn(
        // Base styles with theme awareness
        "flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2",
        "text-base shadow-xs transition-all duration-200 ease-in-out",
        "placeholder:text-muted-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        "field-sizing-content", // Auto-resize
        
        // Focus states with enhanced ring
        "focus-visible:outline-none focus-visible:border-ring",
        "focus-visible:ring-2 focus-visible:ring-ring/20",
        "focus-visible:ring-offset-0",
        
        // Error states with theme awareness
        error && [
          "border-destructive",
          "focus-visible:border-destructive",
          "focus-visible:ring-destructive/20",
          "dark:focus-visible:ring-destructive/40"
        ],
        
        // Disabled states
        "disabled:cursor-not-allowed disabled:opacity-50",
        
        // Dark mode enhancements
        "dark:bg-input/30",
        
        // Mobile optimizations
        "md:text-sm", // Prevent zoom on iOS
        
        className
      )}
      {...props}
    />
  )
}

/**
 * Enhanced button component with consistent interactive states
 */
export function ThemedButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}) {
  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
        "text-sm font-medium transition-all duration-200 ease-in-out",
        "disabled:pointer-events-none disabled:opacity-50",
        "outline-none",
        
        // Enhanced focus states
        "focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
        "focus-visible:border-ring",
        
        // Size variants
        size === "default" && "h-9 px-4 py-2",
        size === "sm" && "h-8 rounded-md px-3 text-xs",
        size === "lg" && "h-10 rounded-md px-8",
        size === "icon" && "h-9 w-9",
        
        // Variant styles with theme awareness
        variant === "default" && [
          "bg-primary text-primary-foreground shadow-xs",
          "hover:bg-primary/90 active:bg-primary/95",
          "focus-visible:ring-primary/20"
        ],
        variant === "destructive" && [
          "bg-destructive text-white shadow-xs",
          "hover:bg-destructive/90 active:bg-destructive/95",
          "focus-visible:ring-destructive/20",
          "dark:bg-destructive/80 dark:hover:bg-destructive/90"
        ],
        variant === "outline" && [
          "border border-input bg-background shadow-xs",
          "hover:bg-accent hover:text-accent-foreground",
          "active:bg-accent/80",
          "dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
        ],
        variant === "secondary" && [
          "bg-secondary text-secondary-foreground shadow-xs",
          "hover:bg-secondary/80 active:bg-secondary/90"
        ],
        variant === "ghost" && [
          "hover:bg-accent hover:text-accent-foreground",
          "active:bg-accent/80",
          "dark:hover:bg-accent/50"
        ],
        variant === "link" && [
          "text-primary underline-offset-4",
          "hover:underline hover:text-primary/80",
          "focus-visible:ring-primary/20"
        ],
        
        className
      )}
      {...props}
    />
  )
}