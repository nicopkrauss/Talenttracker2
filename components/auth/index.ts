export { AuthCard } from "./auth-card"
export { PublicLayout } from "./public-layout"
export { RegistrationForm } from "./registration-form"
export { LoginForm } from "./login-form"
export { ProtectedRoute } from "./protected-route"
export { PendingApprovalPage } from "./pending-approval-page"
export { PendingUsersTable } from "./pending-users-table"
export { ApprovalConfirmationDialog } from "./approval-confirmation-dialog"
export { useUserApproval } from "./use-user-approval"
export { Unauthorized } from "./unauthorized"
export { withAuth, withAdminAuth, withApprovedAuth, withBasicAuth } from "./with-auth"

// Re-export the route guard hook
export { useRouteGuard } from "../../hooks/use-route-guard"