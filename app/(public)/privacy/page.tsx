export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-gray max-w-none dark:prose-invert">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, 
            fill out a form, or contact us for support.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, 
            process transactions, and communicate with you.
          </p>

          <h2>3. Information Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            without your consent, except as described in this policy.
          </p>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide our services 
            and fulfill the purposes outlined in this policy.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information. You may 
            also opt out of certain communications from us.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at 
            privacy@talenttracker.com.
          </p>
        </div>
      </div>
    </div>
  )
}