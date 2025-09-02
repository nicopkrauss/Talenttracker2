"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ProjectRoleTemplate, ProjectRoleTemplateFormData, ProjectRole } from '@/lib/types'
import { Plus, Edit, Trash2, FileText, Clock, Save, X, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProjectRoleTemplateManagerProps {
  projectId: string
  onUpdate?: () => void
}

export function ProjectRoleTemplateManager({ projectId, onUpdate }: ProjectRoleTemplateManagerProps) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<ProjectRoleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<ProjectRoleTemplate | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<ProjectRoleTemplateFormData>({
    role: 'talent_escort',
    display_name: '',
    base_pay_rate: 0,
    time_type: 'hourly',
    description: '',
    is_active: true,
    is_default: false,
    sort_order: 0
  })

  const roleOptions: { value: ProjectRole; label: string }[] = [
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'talent_logistics_coordinator', label: 'Talent Logistics Coordinator' },
    { value: 'talent_escort', label: 'Escort' }
  ]

  useEffect(() => {
    loadTemplates()
  }, [projectId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/role-templates`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.roleTemplates || [])
      } else {
        throw new Error('Failed to load role templates')
      }
    } catch (error) {
      console.error('Error loading role templates:', error)
      toast({
        title: "Error",
        description: "Failed to load role templates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Client-side validation for duplicate display names
    if (!editingTemplate) {
      const existingTemplate = templates.find(
        t => t.role === formData.role && 
        t.display_name.toLowerCase() === formData.display_name.toLowerCase()
      )
      
      if (existingTemplate) {
        toast({
          title: "Duplicate Template Name",
          description: `A template named "${formData.display_name}" already exists for this role. Please choose a different name.`,
          variant: "destructive"
        })
        return
      }
    }

    try {
      const url = editingTemplate 
        ? `/api/projects/${projectId}/role-templates/${editingTemplate.id}`
        : `/api/projects/${projectId}/role-templates`
      
      const method = editingTemplate ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Role template ${editingTemplate ? 'updated' : 'created'} successfully`,
        })
        setIsDialogOpen(false)
        setEditingTemplate(null)
        resetForm()
        await loadTemplates()
        onUpdate?.()
      } else {
        const error = await response.json()
        // Provide more user-friendly error messages
        let errorMessage = error.error || 'Failed to save role template'
        if (errorMessage.includes('duplicate key value violates unique constraint')) {
          errorMessage = `A template named "${formData.display_name}" already exists for this role. Please choose a different name.`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error saving role template:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save role template",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (template: ProjectRoleTemplate) => {
    if (!confirm(`Are you sure you want to delete the ${template.display_name} role template?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/role-templates/${template.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Role template deleted successfully",
        })
        await loadTemplates()
        onUpdate?.()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete role template')
      }
    } catch (error) {
      console.error('Error deleting role template:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete role template",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (template: ProjectRoleTemplate) => {
    setEditingTemplate(template)
    setFormData({
      role: template.role,
      display_name: template.display_name,
      base_pay_rate: template.base_pay_rate,
      time_type: template.time_type,
      description: template.description || '',
      is_active: template.is_active,
      is_default: template.is_default,
      sort_order: template.sort_order
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      role: 'talent_escort',
      display_name: '',
      base_pay_rate: 0,
      time_type: 'hourly',
      description: '',
      is_active: true,
      is_default: false,
      sort_order: 0
    })
  }

  const handleNewTemplate = () => {
    setEditingTemplate(null)
    resetForm()
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading role templates...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Role Templates
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Role Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Role Template' : 'Add Role Template'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: ProjectRole) => setFormData(prev => ({ ...prev, role: value }))}
                    disabled={!!editingTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="e.g., Senior Supervisor"
                  />
                  {/* Show existing templates for this role */}
                  {(() => {
                    const existingForRole = templates.filter(t => t.role === formData.role && t.id !== editingTemplate?.id)
                    if (existingForRole.length > 0) {
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          Existing templates: {existingForRole.map(t => t.display_name).join(', ')}
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_pay_rate">Base Pay Rate</Label>
                    <Input
                      id="base_pay_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.base_pay_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_pay_rate: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time_type">Time Type</Label>
                    <Select 
                      value={formData.time_type} 
                      onValueChange={(value: 'hourly' | 'daily') => setFormData(prev => ({ ...prev, time_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Role responsibilities and requirements..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_default" className="text-sm">
                    Set as default template for this role
                  </Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingTemplate(null)
                      resetForm()
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No role templates defined yet.</p>
            <p className="text-sm">Add role templates to define pay rates and requirements for this project.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{template.display_name}</h3>
                    <Badge variant="secondary">
                      {roleOptions.find(r => r.value === template.role)?.label}
                    </Badge>
                    {template.is_default && (
                      <Badge variant="default" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${template.base_pay_rate}{template.time_type === 'hourly' ? '/hr' : '/day'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {template.time_type}
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}