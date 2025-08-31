"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  Settings, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react'
import { ProjectRoleManager } from './project-role-manager'
import { useAuth } from '@/lib/auth-context'
import { hasAdminAccess } from '@/lib/role-utils'

interface ProjectRolesChecklistItemProps {
  projectId: string
  isCompleted: boolean
  onCompletionChange: (completed: boolean) => void
  disabled?: boolean
}

export function ProjectRolesChecklistItem({ 
  projectId, 
  isCompleted, 
  onCompletionChange, 
  disabled = false 
}: ProjectRolesChecklistItemProps) {
  const { userProfile } = useAuth()
  const [showRoleManager, setShowRoleManager] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user can manage roles
  const canManageRoles = userProfile ? hasAdminAccess(userProfile.role) : false

  const handleToggleComplete = async (checked: boolean) => {
    if (disabled || !canManageRoles) return

    try {
      setLoading(true)
      setError(null)

      const endpoint = `/api/projects/${projectId}/roles/complete`
      const method = checked ? 'POST' : 'DELETE'

      const response = await fetch(endpoint, { method })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update completion status')
      }

      onCompletionChange(checked)
    } catch (err: any) {
      console.error('Error updating completion status:', err)
      setError(err.message || 'Failed to update completion status')
    } finally {
      setLoading(false)
    }
  }

  const handleRolesUpdated = () => {
    // When roles are updated, we can automatically mark as complete if there are configured roles
    // The role manager will handle this logic
    setShowRoleManager(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Checkbox
          id="roles-pay"
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          disabled={disabled || loading || !canManageRoles}
        />
        <div className="flex-1">
          <label 
            htmlFor="roles-pay" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Add Project Roles & Pay Rates
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Configure team roles and set base pay rates for the project
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {isCompleted && !loading && (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          )}
          {canManageRoles && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleManager(!showRoleManager)}
              disabled={loading}
            >
              <Settings className="h-4 w-4 mr-1" />
              {showRoleManager ? 'Hide' : 'Configure'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showRoleManager && (
        <div className="ml-6 border-l-2 border-muted pl-4">
          <ProjectRoleManager 
            projectId={projectId} 
            onRolesUpdated={handleRolesUpdated}
          />
        </div>
      )}

      {!canManageRoles && (
        <div className="ml-6 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Only administrators and in-house users can configure project roles and pay rates.
          </p>
        </div>
      )}
    </div>
  )
}