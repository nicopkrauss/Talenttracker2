"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, User, PenLine, Shield, AlertTriangle } from 'lucide-react'
import { AuditLogEntry, ValueFormatter } from '@/lib/audit-log-service'
import { cn } from '@/lib/utils'

interface AuditLogEntryProps {
  entry: AuditLogEntry
  isGrouped?: boolean
  className?: string
}

export function AuditLogEntryComponent({ entry, isGrouped = false, className }: AuditLogEntryProps) {
  // Get action type styling and icon
  const getActionTypeConfig = (actionType: string) => {
    switch (actionType) {
      case 'user_edit':
        return {
          variant: 'secondary' as const,
          icon: PenLine,
          label: 'User Edit',
          description: 'Modified by user'
        }
      case 'admin_edit':
        return {
          variant: 'default' as const,
          icon: Shield,
          label: 'Admin Edit',
          description: 'Modified by administrator'
        }
      case 'rejection_edit':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          label: 'Rejection Edit',
          description: 'Modified during rejection'
        }
      default:
        return {
          variant: 'outline' as const,
          icon: PenLine,
          label: actionType,
          description: 'Unknown action type'
        }
    }
  }

  const actionConfig = getActionTypeConfig(entry.action_type)
  const ActionIcon = actionConfig.icon

  // Format field name for display
  const fieldDisplayName = ValueFormatter.formatFieldName(entry.field_name)

  // Format values for display
  const oldValueDisplay = ValueFormatter.formatOldValue(entry.field_name, entry.old_value)
  const newValueDisplay = ValueFormatter.formatNewValue(entry.field_name, entry.new_value)

  // Format timestamp
  const timestampDisplay = ValueFormatter.formatTimestamp(entry.changed_at)

  // Get user display name
  const userDisplayName = entry.changed_by_profile?.full_name || 'Unknown User'

  return (
    <Card className={cn(
      "border-l-4 transition-colors",
      {
        "border-l-muted-foreground": entry.action_type === 'user_edit',
        "border-l-primary": entry.action_type === 'admin_edit',
        "border-l-destructive": entry.action_type === 'rejection_edit'
      },
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with action type and timestamp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActionIcon className="h-4 w-4" />
              <Badge variant={actionConfig.variant} className="text-xs">
                {actionConfig.label}
              </Badge>
              {!isGrouped && (
                <span className="text-xs text-muted-foreground">
                  {actionConfig.description}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timestampDisplay}
            </div>
          </div>

          {/* Field change details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{fieldDisplayName}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {/* Old value */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Previous Value
                </span>
                <div className="p-2 bg-muted/50 rounded border">
                  <span className={cn(
                    "font-mono text-xs",
                    entry.old_value === null ? "text-muted-foreground italic" : ""
                  )}>
                    {oldValueDisplay}
                  </span>
                </div>
              </div>

              {/* New value */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  New Value
                </span>
                <div className="p-2 bg-muted/50 rounded border">
                  <span className={cn(
                    "font-mono text-xs",
                    entry.new_value === null ? "text-muted-foreground italic" : ""
                  )}>
                    {newValueDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User information */}
          {!isGrouped && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Changed by <span className="font-medium">{userDisplayName}</span>
              </span>
              {entry.work_date && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    Work date: {entry.work_date.toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}