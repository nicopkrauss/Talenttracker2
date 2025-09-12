"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TalentGroup } from '@/lib/types'
import { TrashButton } from '@/components/ui/trash-button'

interface GroupEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  group: TalentGroup | null
  onGroupUpdated: () => Promise<void>
}

interface GroupMember {
  name: string
  role: string
}

interface FormData {
  groupName: string
  pointOfContactName: string
  pointOfContactPhone: string
  members: GroupMember[]
}

export function GroupEditModal({
  open,
  onOpenChange,
  projectId,
  group,
  onGroupUpdated
}: GroupEditModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    groupName: '',
    pointOfContactName: '',
    pointOfContactPhone: '',
    members: [{ name: '', role: '' }]
  })

  // Reset form when group changes
  useEffect(() => {
    if (group && open) {
      setFormData({
        groupName: group.groupName || group.group_name || '',
        pointOfContactName: group.pointOfContactName || group.point_of_contact_name || '',
        pointOfContactPhone: group.pointOfContactPhone || group.point_of_contact_phone || '',
        members: group.members && group.members.length > 0 
          ? group.members.map(member => ({ name: member.name, role: member.role }))
          : [{ name: '', role: '' }]
      })
    } else if (!open) {
      // Reset form when modal closes
      setFormData({
        groupName: '',
        pointOfContactName: '',
        pointOfContactPhone: '',
        members: [{ name: '', role: '' }]
      })
    }
  }, [group, open])

  const handleSubmit = async () => {
    if (!group) return

    // Validation
    if (!formData.groupName.trim()) {
      toast({
        title: "Validation Error",
        description: "Group name is required",
        variant: "destructive"
      })
      return
    }

    if (!formData.pointOfContactName.trim()) {
      toast({
        title: "Validation Error", 
        description: "Point of contact name is required",
        variant: "destructive"
      })
      return
    }

    if (!formData.pointOfContactPhone.trim()) {
      toast({
        title: "Validation Error",
        description: "Point of contact phone is required", 
        variant: "destructive"
      })
      return
    }

    // Filter out empty members
    const validMembers = formData.members.filter(member => 
      member.name.trim() && member.role.trim()
    )

    if (validMembers.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one group member is required",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/talent-groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: formData.groupName.trim(),
          pointOfContactName: formData.pointOfContactName.trim(),
          pointOfContactPhone: formData.pointOfContactPhone.trim(),
          members: validMembers
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent group updated successfully"
        })
        onOpenChange(false)
        await onGroupUpdated()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update talent group')
      }
    } catch (error) {
      console.error('Error updating talent group:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update talent group",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddMember = () => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { name: '', role: '' }]
    }))
  }

  const handleRemoveMember = (index: number) => {
    if (formData.members.length === 1) return // Keep at least one member
    
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }))
  }

  const handleMemberChange = (index: number, field: 'name' | 'role', value: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }))
  }

  if (!group) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edit Talent Group
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Group Name */}
          <div>
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={(e) => setFormData(prev => ({ ...prev, groupName: e.target.value }))}
              placeholder="e.g., The Beatles, Dance Troupe A"
              className="mt-1"
            />
          </div>

          {/* Point of Contact */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Point of Contact (Optional)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  placeholder="Contact name"
                  value={formData.pointOfContactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, pointOfContactName: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  placeholder="Phone number"
                  value={formData.pointOfContactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, pointOfContactPhone: e.target.value }))}
                  type="tel"
                />
              </div>
            </div>
          </div>

          {/* Group Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Group Members *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMember}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {formData.members.map((member, index) => (
                <div key={index} className="border border-border rounded-md p-3 bg-card">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Member name *"
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Role (optional)"
                        value={member.role}
                        onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                      />
                    </div>
                    <TrashButton
                      onClick={() => handleRemoveMember(index)}
                      disabled={formData.members.length === 1}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {formData.members.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                {formData.members.filter(m => m.name.trim()).length} valid members
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>Updating...</>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Update Group
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}