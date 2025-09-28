"use client"

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Clock, 
  User, 
  Edit3, 
  Shield, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  FilePen
} from 'lucide-react'
import { GroupedAuditEntry, ValueFormatter } from '@/lib/audit-log-service'
import { AuditLogEntryComponent } from './audit-log-entry'
import { cn } from '@/lib/utils'

interface GroupedAuditEntryProps {
  group: GroupedAuditEntry
  defaultExpanded?: boolean
  className?: string
}

export function GroupedAuditEntryComponent({ 
  group, 
  defaultExpanded = false, 
  className 
}: GroupedAuditEntryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Get action type styling and icon
  const getActionTypeConfig = (actionType: string) => {
    switch (actionType) {
      case 'user_edit':
        return {
          variant: 'secondary' as const,
          icon: Edit3,
          label: 'User Edit',
          description: 'Modified by user',
          borderColor: 'border-l-muted-foreground'
        }
      case 'admin_edit':
        return {
          variant: 'default' as const,
          icon: Shield,
          label: 'Admin Edit',
          description: 'Modified by administrator',
          borderColor: 'border-l-primary'
        }
      case 'rejection_edit':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          label: 'Rejection Edit',
          description: 'Modified during rejection',
          borderColor: 'border-l-destructive'
        }
      default:
        return {
          variant: 'outline' as const,
          icon: Edit3,
          label: actionType,
          description: 'Unknown action type',
          borderColor: 'border-l-muted'
        }
    }
  }

  const actionConfig = getActionTypeConfig(group.action_type)
  const ActionIcon = actionConfig.icon

  // Format timestamp
  const timestampDisplay = ValueFormatter.formatTimestamp(group.changed_at)

  // Get user display name
  const userDisplayName = group.changed_by_profile?.full_name || 'Unknown User'

  // Generate summary of changes
  const changesSummary = () => {
    const fieldNames = group.changes.map(change => 
      ValueFormatter.formatFieldName(change.field_name)
    )
    
    if (fieldNames.length === 1) {
      return `Modified ${fieldNames[0]}`
    } else if (fieldNames.length === 2) {
      return `Modified ${fieldNames[0]} and ${fieldNames[1]}`
    } else {
      return `Modified ${fieldNames.length} fields: ${fieldNames.slice(0, 2).join(', ')}${fieldNames.length > 2 ? `, and ${fieldNames.length - 2} more` : ''}`
    }
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn(
        "border-l-4 transition-colors",
        actionConfig.borderColor,
        className
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Expand/Collapse indicator */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Action type and summary */}
                <div className="flex items-center gap-2">
                  <ActionIcon className="h-4 w-4" />
                  <Badge variant={actionConfig.variant} className="text-xs">
                    {actionConfig.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <FilePen className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {changesSummary()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {/* User info */}
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{userDisplayName}</span>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{timestampDisplay}</span>
                </div>

                {/* Change count */}
                <Badge variant="outline" className="text-xs">
                  {group.changes.length} {group.changes.length === 1 ? 'field' : 'fields'}
                </Badge>
              </div>
            </div>

            {/* Quick preview of changes when collapsed */}
            {!isExpanded && group.changes.length <= 3 && (
              <div className="mt-2 ml-7 space-y-1">
                {group.changes.slice(0, 3).map((change, index) => (
                  <div key={change.id} className="text-xs text-muted-foreground">
                    <span className="font-medium">
                      {ValueFormatter.formatFieldName(change.field_name)}:
                    </span>
                    <span className="ml-1">
                      {ValueFormatter.formatOldValue(change.field_name, change.old_value)}
                    </span>
                    <span className="mx-1">→</span>
                    <span>
                      {ValueFormatter.formatNewValue(change.field_name, change.new_value)}
                    </span>
                  </div>
                ))}
                {group.changes.length > 3 && (
                  <div className="text-xs text-muted-foreground italic">
                    ... and {group.changes.length - 3} more changes
                  </div>
                )}
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="space-y-3 ml-7">
              {/* Action description */}
              <div className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                {actionConfig.description}
                {group.changes[0]?.work_date && (
                  <span className="ml-2">
                    • Work date: {group.changes[0].work_date.toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Individual field changes */}
              <div className="space-y-2">
                {group.changes.map((change) => (
                  <div key={change.id} className="border rounded-lg p-3 bg-muted/20">
                    <div className="space-y-2">
                      {/* Field name */}
                      <div className="font-medium text-sm">
                        {ValueFormatter.formatFieldName(change.field_name)}
                      </div>
                      
                      {/* Value change */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {/* Old value */}
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Previous
                          </span>
                          <div className="p-2 bg-background rounded border">
                            <span className={cn(
                              "font-mono text-xs",
                              change.old_value === null ? "text-muted-foreground italic" : ""
                            )}>
                              {ValueFormatter.formatOldValue(change.field_name, change.old_value)}
                            </span>
                          </div>
                        </div>

                        {/* New value */}
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            New
                          </span>
                          <div className="p-2 bg-background rounded border">
                            <span className={cn(
                              "font-mono text-xs",
                              change.new_value === null ? "text-muted-foreground italic" : ""
                            )}>
                              {ValueFormatter.formatNewValue(change.field_name, change.new_value)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}