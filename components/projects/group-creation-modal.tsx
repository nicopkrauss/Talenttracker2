"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TalentGroupInput, GroupMemberInput } from '@/lib/types'

interface GroupCreationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onGroupCreated: () => Promise<void>
}

export function GroupCreationModal({ 
  open, 
  onOpenChange, 
  projectId, 
  onGroupCreated 
}: GroupCreationModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<{
    groupName: string
    members: GroupMemberInput[]
  }>({
    groupName: '',
    members: [{ name: '', role: '' }]
  })

  const handleAddMember = () => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { name: '', role: '' }]
    }))
  }

  const handleRemoveMember = (index: number) => {
    if (formData.members.length > 1) {
      setFormData(prev => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index)
      }))
    }
  }

  const handleMemberChange = (index: number, field: keyof GroupMemberInput, value: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: keyof GroupMemberInput) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      // If we're on the last field of the last row, add a new row
      if (index === formData.members.length - 1 && field === 'role') {
        e.preventDefault()
        handleAddMember()
        // Focus will be set to the new row's name field after state update
        setTimeout(() => {
          const newRowNameInput = document.querySelector(`input[data-member-index="${index + 1}"][data-field="name"]`) as HTMLInputElement
          if (newRowNameInput) {
            newRowNameInput.focus()
          }
        }, 0)
      }
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.groupName.trim()) {
      toast({
        title: "Validation Error",
        description: "Group name is required",
        variant: "destructive"
      })
      return
    }

    const validMembers = formData.members.filter(m => m.name.trim())
    if (validMembers.length === 0) {
      toast({
        title: "Validation Error", 
        description: "At least one group member with a name is required",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const groupData: TalentGroupInput = {
        projectId,
        groupName: formData.groupName.trim(),
        members: validMembers,
        scheduledDates: [] // Will be set later in scheduling interface
      }

      const response = await fetch(`/api/projects/${projectId}/talent-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Talent group created successfully"
        })
        
        // Reset form
        setFormData({
          groupName: '',
          members: [{ name: '', role: '' }]
        })
        
        onOpenChange(false)
        await onGroupCreated()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create talent group')
      }
    } catch (error) {
      console.error('Error creating talent group:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create talent group",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      groupName: '',
      members: [{ name: '', role: '' }]
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Talent Group
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
                        onKeyDown={(e) => handleKeyDown(e, index, 'name')}
                        data-member-index={index}
                        data-field="name"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Role (optional)"
                        value={member.role}
                        onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'role')}
                        data-member-index={index}
                        data-field="role"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(index)}
                      disabled={formData.members.length === 1}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
              onClick={handleCancel}
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
                <>Creating...</>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Create Group
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}