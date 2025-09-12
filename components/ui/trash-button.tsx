"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface TrashButtonProps {
  onClick: (e?: React.MouseEvent) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default'
  variant?: 'ghost' | 'outline'
}

export function TrashButton({ 
  onClick, 
  disabled = false, 
  className = '',
  size = 'default',
  variant = 'ghost'
}: TrashButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={`h-7 w-7 p-0 text-destructive hover:text-destructive ${className}`}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  )
}