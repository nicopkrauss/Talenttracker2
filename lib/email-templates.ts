/**
 * Email Templates for Talent Tracker Notifications
 * 
 * This module provides reusable email templates for different types of notifications.
 * Templates include both HTML and plain text versions for better compatibility.
 */

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface TemplateData {
  fullName: string
  email?: string
  loginUrl?: string
  supportEmail?: string
  companyName?: string
}

/**
 * Default template data that can be overridden
 */
const defaultTemplateData: Partial<TemplateData> = {
  loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://talent-tracker.com',
  supportEmail: 'support@talent-tracker.com',
  companyName: 'Talent Tracker'
}

/**
 * Generate approval notification email template
 */
export function getApprovalEmailTemplate(data: TemplateData): EmailTemplate {
  const templateData = { ...defaultTemplateData, ...data }
  
  return {
    subject: `Welcome to ${templateData.companyName} - Account Approved!`,
    
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${templateData.companyName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #ffffff;
            margin: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333;
            font-size: 24px;
            margin: 0 0 20px 0;
        }
        .content p {
            margin: 0 0 16px 0;
            font-size: 16px;
        }
        .highlight-box {
            background: #e3f2fd;
            padding: 20px;
            border-left: 4px solid #2196f3;
            margin: 25px 0;
            border-radius: 4px;
        }
        .highlight-box strong {
            color: #1976d2;
            font-size: 18px;
        }
        .feature-list {
            margin: 20px 0;
        }
        .feature-list ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .feature-list li {
            margin: 8px 0;
            font-size: 15px;
        }
        .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            margin: 25px 0;
            font-weight: 600;
            font-size: 16px;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e1e5e9;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            color: #6c757d;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background: #e1e5e9;
            margin: 30px 0;
        }
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎉 Welcome to ${templateData.companyName}!</h1>
            <p>Your account has been approved and is ready to use</p>
        </div>
        
        <div class="content">
            <h2>Hello ${templateData.fullName},</h2>
            
            <p>Great news! Your ${templateData.companyName} account has been approved by our team and is now active.</p>
            
            <div class="highlight-box">
                <strong>🚀 You're all set!</strong><br>
                You can now log in and access all features of the ${templateData.companyName} system. We're excited to have you on board!
            </div>
            
            <div class="feature-list">
                <p><strong>Here's what you can do now:</strong></p>
                <ul>
                    <li>📊 Access your personalized dashboard</li>
                    <li>👥 Manage talent profiles and information</li>
                    <li>📋 Track project assignments and status</li>
                    <li>🤝 Collaborate with your team members</li>
                    <li>⏰ Submit and manage timecards</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${templateData.loginUrl}" class="cta-button">Log In to Your Account</a>
            </div>
            
            <div class="divider"></div>
            
            <p>If you have any questions or need assistance getting started, our support team is here to help. Simply reply to this email or contact us at <a href="mailto:${templateData.supportEmail}">${templateData.supportEmail}</a>.</p>
            
            <p>Welcome to the team!</p>
            
            <p>Best regards,<br>
            <strong>The ${templateData.companyName} Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This email was sent because your account was approved by an administrator.</p>
            <p>If you have any questions, please contact us at <a href="mailto:${templateData.supportEmail}">${templateData.supportEmail}</a></p>
            <p>© ${new Date().getFullYear()} ${templateData.companyName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,

    text: `Welcome to ${templateData.companyName} - Account Approved!

Hello ${templateData.fullName},

Great news! Your ${templateData.companyName} account has been approved by our team and is now active.

🚀 YOU'RE ALL SET!
You can now log in and access all features of the ${templateData.companyName} system. We're excited to have you on board!

Here's what you can do now:
• Access your personalized dashboard
• Manage talent profiles and information  
• Track project assignments and status
• Collaborate with your team members
• Submit and manage timecards

Log in to your account: ${templateData.loginUrl}

If you have any questions or need assistance getting started, our support team is here to help. Simply reply to this email or contact us at ${templateData.supportEmail}.

Welcome to the team!

Best regards,
The ${templateData.companyName} Team

---
This email was sent because your account was approved by an administrator.
If you have any questions, please contact us at ${templateData.supportEmail}
© ${new Date().getFullYear()} ${templateData.companyName}. All rights reserved.`
  }
}

/**
 * Generate rejection notification email template
 */
export function getRejectionEmailTemplate(data: TemplateData & { reason?: string }): EmailTemplate {
  const templateData = { ...defaultTemplateData, ...data }
  
  return {
    subject: `${templateData.companyName} Account Application Update`,
    
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${templateData.companyName} Account Application</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #ffffff;
            margin: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #6c757d;
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .content {
            padding: 40px 30px;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e1e5e9;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${templateData.companyName} Account Application</h1>
        </div>
        
        <div class="content">
            <h2>Hello ${templateData.fullName},</h2>
            
            <p>Thank you for your interest in ${templateData.companyName}. After reviewing your application, we are unable to approve your account at this time.</p>
            
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            
            <p>If you believe this is an error or would like to discuss your application further, please contact our support team at <a href="mailto:${templateData.supportEmail}">${templateData.supportEmail}</a>.</p>
            
            <p>Thank you for your understanding.</p>
            
            <p>Best regards,<br>
            <strong>The ${templateData.companyName} Team</strong></p>
        </div>
        
        <div class="footer">
            <p>If you have any questions, please contact us at <a href="mailto:${templateData.supportEmail}">${templateData.supportEmail}</a></p>
        </div>
    </div>
</body>
</html>`,

    text: `${templateData.companyName} Account Application Update

Hello ${templateData.fullName},

Thank you for your interest in ${templateData.companyName}. After reviewing your application, we are unable to approve your account at this time.

${data.reason ? `Reason: ${data.reason}` : ''}

If you believe this is an error or would like to discuss your application further, please contact our support team at ${templateData.supportEmail}.

Thank you for your understanding.

Best regards,
The ${templateData.companyName} Team

---
If you have any questions, please contact us at ${templateData.supportEmail}`
  }
}

/**
 * Generate welcome notification email template (for new registrations)
 */
export function getWelcomeEmailTemplate(data: TemplateData): EmailTemplate {
  const templateData = { ...defaultTemplateData, ...data }
  
  return {
    subject: `Welcome to ${templateData.companyName} - Registration Received`,
    
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${templateData.companyName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: #ffffff;
            margin: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .content {
            padding: 40px 30px;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e1e5e9;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>👋 Welcome to ${templateData.companyName}!</h1>
            <p>Your registration has been received</p>
        </div>
        
        <div class="content">
            <h2>Hello ${templateData.fullName},</h2>
            
            <p>Thank you for registering with ${templateData.companyName}! We've received your application and it's currently being reviewed by our team.</p>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>Our team will review your application</li>
                <li>You'll receive an email notification once your account is approved</li>
                <li>After approval, you can log in and start using the system</li>
            </ul>
            
            <p>We typically review applications within 1-2 business days. If you have any questions in the meantime, please don't hesitate to contact us at <a href="mailto:${templateData.supportEmail}">${templateData.supportEmail}</a>.</p>
            
            <p>Thank you for your patience!</p>
            
            <p>Best regards,<br>
            <strong>The ${templateData.companyName} Team</strong></p>
        </div>
        
        <div class="footer">
            <p>If you have any questions, please contact us at <a href="mailto:${templateData.supportEmail}">${templateData.supportEmail}</a></p>
        </div>
    </div>
</body>
</html>`,

    text: `Welcome to ${templateData.companyName} - Registration Received

Hello ${templateData.fullName},

Thank you for registering with ${templateData.companyName}! We've received your application and it's currently being reviewed by our team.

What happens next?
• Our team will review your application
• You'll receive an email notification once your account is approved  
• After approval, you can log in and start using the system

We typically review applications within 1-2 business days. If you have any questions in the meantime, please don't hesitate to contact us at ${templateData.supportEmail}.

Thank you for your patience!

Best regards,
The ${templateData.companyName} Team

---
If you have any questions, please contact us at ${templateData.supportEmail}`
  }
}

/**
 * Get email template by type
 */
export function getEmailTemplate(
  type: 'approval' | 'rejection' | 'welcome',
  data: TemplateData & { reason?: string }
): EmailTemplate {
  switch (type) {
    case 'approval':
      return getApprovalEmailTemplate(data)
    case 'rejection':
      return getRejectionEmailTemplate(data)
    case 'welcome':
      return getWelcomeEmailTemplate(data)
    default:
      throw new Error(`Unknown email template type: ${type}`)
  }
}