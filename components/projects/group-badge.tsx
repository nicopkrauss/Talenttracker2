"use client"

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Users } from 'lucide-react'

interface GroupBadgeProps {
  className?: string
  showTooltip?: boolean
}

export function GroupBadge({ className, showTooltip = false }: GroupBadgeProps) {
  const badge = (
    <Badge 
      variant="secondary" 
      className={`gap-1 ${className || ''}`}
    >
      <Users className="h-3 w-3" />
      GROUP
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p>Click to show all members</p>
      </TooltipContent>
    </Tooltip>
  )
}