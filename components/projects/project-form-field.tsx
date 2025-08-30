"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ProjectFormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function ProjectFormField({
  label,
  description,
  error,
  required = false,
  className,
  children
}: ProjectFormFieldProps) {
  const id = React.useId()
  
  return (
    <div className={cn("space-y-2", className)}>
      <label 
        htmlFor={id}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          error && "text-destructive",
          required && "after:content-['*'] after:ml-0.5 after:text-destructive"
        )}
      >
        {label}
      </label>
      
      <div id={id}>
        {children}
      </div>
      
      {description && !error && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      
      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}