"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserCheck, Users } from "lucide-react"
import type { PendingUser } from "@/lib/types"

interface ApprovalConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: PendingUser[]
  onConfirm: () => void
  loading?: boolean
}

export function ApprovalConfirmationDialog({
  open,
  onOpenChange,
  users,
  onConfirm,
  loading = false
}: ApprovalConfirmationDialogProps) {
  const userCount = users.length
  const isSingle = userCount === 1
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            {isSingle ? (
              <UserCheck className="w-5 h-5 mr-2" />
            ) : (
              <Users className="w-5 h-5 mr-2" />
            )}
            {isSingle ? "Approve User Account" : `Approve ${userCount} User Accounts`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSingle ? (
              `Are you sure you want to approve ${users[0]?.full_name}'s account?`
            ) : (
              `Are you sure you want to approve ${userCount} user accounts?`
            )}
          </AlertDialogDescription>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">This will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {isSingle ? (
                  <>
                    <li>Grant them access to the Talent Tracker system</li>
                    <li>Send them a welcome notification</li>
                    <li>Allow them to log in and use the application</li>
                  </>
                ) : (
                  <>
                    <li>Grant all selected users access to the Talent Tracker system</li>
                    <li>Send welcome notifications to all approved users</li>
                    <li>Allow them to log in and use the application</li>
                  </>
                )}
              </ul>
            </div>
            {!isSingle && (
              <div className="bg-muted/50 border border-border p-3 rounded-md">
                <p className="text-sm font-medium mb-2 text-foreground">Users to be approved:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="text-sm text-muted-foreground">
                      • {user.full_name} ({user.email})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Approving...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                {isSingle ? "Approve User" : `Approve ${userCount} Users`}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}