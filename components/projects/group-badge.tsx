"use client"

import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface GroupBadgeProps {
  className?: string
}

export function GroupBadge({ className }: GroupBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={`gap-1 ${className || ''}`}
    >
      <Users className="h-3 w-3" />
      GROUP
    </Badge>
  )
}