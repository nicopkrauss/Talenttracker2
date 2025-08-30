export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-gray max-w-none dark:prose-invert">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Talent Tracker, you accept and agree to be bound by the terms 
            and provision of this agreement.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily use Talent Tracker for personal, non-commercial 
            transitory viewing only. This is the grant of a license, not a transfer of title.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            When you create an account with us, you must provide information that is accurate, 
            complete, and current at all times. You are responsible for safeguarding the password 
            and for all activities that occur under your account.
          </p>

          <h2>4. Privacy Policy</h2>
          <p>
            Your privacy is important to us. Please review our Privacy Policy, which also governs 
            your use of the Service, to understand our practices.
          </p>

          <h2>5. Prohibited Uses</h2>
          <p>
            You may not use our service for any unlawful purpose or to solicit others to perform 
            unlawful acts. You may not violate any local, state, national, or international law.
          </p>

          <h2>6. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at 
            legal@talenttracker.com.
          </p>
        </div>
      </div>
    </div>
  )
}