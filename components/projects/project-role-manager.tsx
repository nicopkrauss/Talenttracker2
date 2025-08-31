"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  Save, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2,
  Users
} from 'lucide-react'
import { ProjectRoleConfig } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { hasAdminAccess } from '@/lib/role-utils'

interface ProjectRoleManagerProps {
  projectId: string
  onRolesUpdated?: () => void
}

interface RoleFormData {
  role_name: 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'
  base_pay_rate?: number
}

const AVAILABLE_ROLES: Array<{
  key: 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'
  label: string
  description: string
}> = [
  {
    key: 'supervisor',
    label: 'Supervisor',
    description: 'On-site manager with day rate tracking and full talent management'
  },
  {
    key: 'talent_logistics_coordinator',
    label: 'Talent Logistics Coordinator (TLC)',
    description: 'Informational oversight role with day rate tracking'
  },
  {
    key: 'talent_escort',
    label: 'Talent Escort',
    description: 'On-the-ground operator with hourly time tracking'
  }
]

export function ProjectRoleManager({ projectId, onRolesUpdated }: ProjectRoleManagerProps) {
  const { userProfile } = useAuth()
  const [roles, setRoles] = useState<ProjectRoleConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, number | undefined>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Check if user can manage roles
  const canManageRoles = userProfile ? hasAdminAccess(userProfile.role) : false

  useEffect(() => {
    fetchRoles()
  }, [projectId])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${projectId}/roles`)
      
      if (!response.ok) {
        throw new Error('Failed to load project roles')
      }
      
      const result = await response.json()
      setRoles(result.data || [])
      
      // Initialize form data with existing pay rates
      const initialFormData: Record<string, number | undefined> = {}
      result.data?.forEach((role: ProjectRoleConfig) => {
        initialFormData[role.role] = role.base_pay ? Number(role.base_pay) : undefined
      })
      setFormData(initialFormData)
      setHasChanges(false)
    } catch (err: any) {
      console.error('Error fetching project roles:', err)
      setError(err.message || 'Failed to load project roles')
    } finally {
      setLoading(false)
    }
  }

  const handlePayRateChange = (roleKey: string, value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value)
    
    setFormData(prev => ({
      ...prev,
      [roleKey]: numericValue
    }))
    setHasChanges(true)
  }

  const validatePayRate = (value: number | undefined): string | null => {
    if (value === undefined) return null
    if (isNaN(value) || value <= 0) return 'Pay rate must be a positive number'
    if (value > 9999.99) return 'Pay rate cannot exceed $9,999.99'
    return null
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate all pay rates
      const validationErrors: string[] = []
      Object.entries(formData).forEach(([roleKey, value]) => {
        const error = validatePayRate(value)
        if (error) {
          validationErrors.push(`${roleKey}: ${error}`)
        }
      })

      if (validationErrors.length > 0) {
        setError(`Validation errors: ${validationErrors.join(', ')}`)
        return
      }

      // Prepare roles data for bulk update
      const rolesToUpdate = AVAILABLE_ROLES.map(role => ({
        role_name: role.key,
        base_pay_rate: formData[role.key]
      })).filter(role => role.base_pay_rate !== undefined)

      if (rolesToUpdate.length === 0) {
        setError('Please set at least one pay rate before saving')
        return
      }

      const response = await fetch(`/api/projects/${projectId}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roles: rolesToUpdate })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save project roles')
      }

      // Mark roles and pay as complete in the checklist
      const completeResponse = await fetch(`/api/projects/${projectId}/roles/complete`, {
        method: 'POST'
      })

      if (!completeResponse.ok) {
        console.warn('Failed to mark roles as complete in checklist, but roles were saved successfully')
      }

      // Refresh roles data
      await fetchRoles()
      setHasChanges(false)
      
      // Notify parent component
      if (onRolesUpdated) {
        onRolesUpdated()
      }

    } catch (err: any) {
      console.error('Error saving project roles:', err)
      setError(err.message || 'Failed to save project roles')
    } finally {
      setSaving(false)
    }
  }

  const getRoleConfig = (roleKey: string): ProjectRoleConfig | undefined => {
    return roles.find(role => role.role === roleKey)
  }

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const isConfigured = (): boolean => {
    return Object.values(formData).some(value => value !== undefined && value > 0)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Roles & Pay Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading roles...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !roles.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Roles & Pay Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Roles & Pay Rates
          </CardTitle>
          {isConfigured() && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!canManageRoles && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only administrators and in-house users can manage project roles and pay rates.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {AVAILABLE_ROLES.map((role) => {
            const existingRole = getRoleConfig(role.key)
            const currentValue = formData[role.key]
            const payRateError = validatePayRate(currentValue)

            return (
              <div key={role.key} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{role.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </div>
                  {existingRole && (
                    <Badge variant="outline" className="ml-2">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs">
                    <Label htmlFor={`pay-rate-${role.key}`} className="text-sm font-medium">
                      Base Pay Rate
                    </Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={`pay-rate-${role.key}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="9999.99"
                        placeholder="0.00"
                        value={currentValue || ''}
                        onChange={(e) => handlePayRateChange(role.key, e.target.value)}
                        disabled={!canManageRoles || saving}
                        className={`pl-10 ${payRateError ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {payRateError && (
                      <p className="text-sm text-destructive mt-1">{payRateError}</p>
                    )}
                  </div>

                  {existingRole && existingRole.base_pay && (
                    <div className="text-sm text-muted-foreground">
                      <span className="block">Current Rate:</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(Number(existingRole.base_pay))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {canManageRoles && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
            </div>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || saving || !isConfigured()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Roles & Pay Rates
                </>
              )}
            </Button>
          </div>
        )}

        {!isConfigured() && canManageRoles && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Set base pay rates for the roles that will be used in this project. 
              Individual team members can have their rates adjusted during assignment.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}