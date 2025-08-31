"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { validatePasswordStrength } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

export function PasswordStrengthIndicator({ 
  password, 
  className 
}: PasswordStrengthIndicatorProps) {
  const { score, checks, strength } = validatePasswordStrength(password)
  
  // Don't show indicator if password is empty
  if (!password) {
    return null
  }

  const strengthColors: Record<string, string> = {
    weak: "bg-red-600 dark:bg-red-400",
    medium: "bg-amber-600 dark:bg-amber-400", 
    strong: "bg-green-600 dark:bg-green-400"
  }

  const strengthLabels: Record<string, string> = {
    weak: "Weak",
    medium: "Medium",
    strong: "Strong"
  }

  const progressValue = (score / 5) * 100

  return (
    <div className={cn(
      "space-y-3 p-3 rounded-lg border border-border/50 bg-muted/30",
      "transition-all duration-300 ease-in-out",
      "animate-in slide-in-from-bottom-2 duration-300",
      className
    )}>
      {/* Enhanced Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Password strength</span>
          <span className={cn(
            "font-semibold transition-colors duration-200 ease-in-out",
            strength === "weak" && "text-red-600 dark:text-red-400",
            strength === "medium" && "text-amber-600 dark:text-amber-400", 
            strength === "strong" && "text-green-600 dark:text-green-400"
          )}>
            {strengthLabels[strength]}
          </span>
        </div>
        <Progress 
          value={progressValue} 
          className={cn(
            "h-2 transition-all duration-300 ease-in-out",
            "bg-muted"
          )}
        />
      </div>

      {/* Enhanced Requirements checklist */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground font-medium">Requirements:</div>
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          <RequirementItem 
            met={checks.length} 
            text="At least 8 characters"
          />
          <RequirementItem 
            met={checks.lowercase} 
            text="One lowercase letter"
          />
          <RequirementItem 
            met={checks.uppercase} 
            text="One uppercase letter"
          />
          <RequirementItem 
            met={checks.number} 
            text="One number"
          />
          <RequirementItem 
            met={checks.special} 
            text="One special character (!@#$%^&*)"
          />
        </div>
      </div>
    </div>
  )
}

interface RequirementItemProps {
  met: boolean
  text: string
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 transition-all duration-200 ease-in-out",
      "hover:bg-muted/50 rounded px-1 py-0.5"
    )}>
      {met ? (
        <Check className="h-3 w-3 text-green-600 dark:text-green-400 transition-colors duration-200 ease-in-out" />
      ) : (
        <X className="h-3 w-3 text-red-600 dark:text-red-400 transition-colors duration-200 ease-in-out" />
      )}
      <span className={cn(
        "transition-colors duration-200 ease-in-out font-medium",
        met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
      )}>
        {text}
      </span>
    </div>
  )
}