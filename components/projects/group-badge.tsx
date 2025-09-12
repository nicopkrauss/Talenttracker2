"use client"

import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'

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
    <SimpleTooltip content="Click to show all members">
      {badge}
    </SimpleTooltip>
  )
}