import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AuthCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode
}

export function AuthCard({ children, className, ...props }: AuthCardProps) {
  return (
    <Card 
      className={cn(
        // Base layout and sizing
        "w-full max-w-md mx-auto",
        // Enhanced styling to match talent page patterns
        "shadow-lg border-0 bg-card",
        // Smooth transitions
        "transition-all duration-200 ease-in-out",
        // Hover effects for better interactivity
        "hover:shadow-xl",
        // Responsive adjustments
        "sm:max-w-lg md:max-w-md",
        className
      )} 
      {...props}
    >
      <CardContent className={cn(
        "pt-4 pb-4 px-6",
        // Reduced responsive padding to optimize space usage
        "sm:px-8 sm:pt-6 sm:pb-6",
        "md:px-8 md:pt-6 md:pb-6"
      )}>
        {children}
      </CardContent>
    </Card>
  )
}