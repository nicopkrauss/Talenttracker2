"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Clock,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Plane
} from "lucide-react"
import { ApprovalConfirmationDialog } from "./approval-confirmation-dialog"
import { useUserApproval } from "./use-user-approval"
import type { PendingUser, SystemRole } from "@/lib/types"
import { REGISTRATION_ROLE_LABELS } from "@/lib/types"

interface PendingUsersTableProps {
  users: PendingUser[]
  onUsersApproved?: () => void
  loading?: boolean
}

export function PendingUsersTable({
  users,
  onUsersApproved,
  loading = false
}: PendingUsersTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [usersToApprove, setUsersToApprove] = useState<PendingUser[]>([])
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const { approveUsers, loading: approving } = useUserApproval()

  // Handle individual user selection
  const handleUserSelect = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers)
    if (checked) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedUsers(newSelected)
  }

  // Handle select all/none
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(user => user.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  // Handle bulk approval
  const handleBulkApproval = () => {
    if (selectedUsers.size === 0) return

    const selectedUsersList = users.filter(user => selectedUsers.has(user.id))
    setUsersToApprove(selectedUsersList)
    setShowConfirmDialog(true)
  }

  // Handle individual approval
  const handleIndividualApproval = (user: PendingUser) => {
    setUsersToApprove([user])
    setShowConfirmDialog(true)
  }

  // Handle role update
  const handleRoleUpdate = async (userId: string, newRole: Exclude<SystemRole, 'admin'>) => {
    setUpdatingRole(userId)
    try {
      const response = await fetch(`/api/auth/update-registration-role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      // Notify parent to refresh data
      onUsersApproved?.()
    } catch (error) {
      console.error('Failed to update role:', error)
      // You might want to show a toast notification here
    } finally {
      setUpdatingRole(null)
    }
  }

  // Confirm approval action
  const handleConfirmApproval = async () => {
    try {
      const userIds = usersToApprove.map(user => user.id)
      await approveUsers(userIds)

      // Clear selection and close dialog
      setSelectedUsers(new Set())
      setShowConfirmDialog(false)
      setUsersToApprove([])

      // Notify parent component to refresh data
      onUsersApproved?.()
    } catch (error) {
      // Error handling is done in the hook
      console.error("Approval failed:", error)
    }
  }

  const isAllSelected = users.length > 0 && selectedUsers.size === users.length
  const isPartiallySelected = selectedUsers.size > 0 && selectedUsers.size < users.length

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Pending Approvals</h3>
          <p className="text-muted-foreground">
            All user registrations have been processed. New registrations will appear here for approval.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Pending Approvals ({users.length})
          </CardTitle>

          {selectedUsers.size > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {selectedUsers.size} selected
              </Badge>
              <Button
                onClick={handleBulkApproval}
                disabled={approving || loading}
                size="sm"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {approving ? "Approving..." : `Approve ${selectedUsers.size} User${selectedUsers.size > 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all users"
                    ref={(el) => {
                      if (el && 'indeterminate' in el) {
                        (el as any).indeterminate = isPartiallySelected
                      }
                    }}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={(checked) =>
                        handleUserSelect(user.id, checked as boolean)
                      }
                      aria-label={`Select ${user.full_name}`}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <Select
                        value={user.role || ''}
                        onValueChange={(value) => handleRoleUpdate(user.id, value as Exclude<SystemRole, 'admin'>)}
                        disabled={updatingRole === user.id}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select role">
                            <div className="flex items-center">
                              <Briefcase className="w-3 h-3 mr-1" />
                              {user.role && user.role !== 'admin' ? REGISTRATION_ROLE_LABELS[user.role as Exclude<SystemRole, 'admin'>] : 'Select role'}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(REGISTRATION_ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Show additional info for flight-eligible roles */}
                      {user.role && ['in_house', 'supervisor', 'coordinator'].includes(user.role) && user.willing_to_fly && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Plane className="w-3 h-3 mr-1" />
                          Willing to fly
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {user.phone && (
                        <div className="text-sm flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {user.nearest_major_city && (
                        <div className="text-sm flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {user.nearest_major_city}
                        </div>
                      )}

                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleIndividualApproval(user)}
                      disabled={approving || loading}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Bulk Actions Footer */}
        {users.length > 1 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Select users above to perform bulk actions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(true)}
                  disabled={isAllSelected}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(false)}
                  disabled={selectedUsers.size === 0}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Approval Confirmation Dialog */}
      <ApprovalConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        users={usersToApprove}
        onConfirm={handleConfirmApproval}
        loading={approving}
      />
    </Card>
  )
}