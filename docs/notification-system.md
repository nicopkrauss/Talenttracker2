# Notification System Documentation

## Overview

The Talent Tracker notification system provides a comprehensive solution for sending email notifications to users for various events such as account approval, rejection, and welcome messages. The system is designed to be extensible, reliable, and easy to integrate with different email service providers.

## Architecture

### Core Components

1. **NotificationService** (`lib/notification-service.ts`)
   - Main service class that handles notification logic
   - Manages notification tracking and delivery
   - Provides methods for different notification types

2. **Email Templates** (`lib/email-templates.ts`)
   - Reusable email templates for different notification types
   - Supports both HTML and plain text formats
   - Responsive design with professional styling

3. **Notification Hook** (`hooks/use-notifications.ts`)
   - React hook for easy integration with components
   - Provides loading states and error handling
   - Supports bulk operations

4. **API Endpoint** (`app/api/notifications/send-email/route.ts`)
   - REST API for sending emails
   - Handles email validation and error responses
   - Configurable for different email service providers

5. **Database Tracking** (Optional)
   - Tracks notification delivery status
   - Provides audit trail for debugging
   - Supports notification history

## Features

### Notification Types

1. **Approval Notifications**
   - Sent when user accounts are approved
   - Includes welcome message and next steps
   - Professional branded template

2. **Welcome Notifications**
   - Sent upon user registration
   - Confirms registration and sets expectations
   - Explains the approval process

3. **Rejection Notifications**
   - Sent when user accounts are rejected
   - Includes optional reason for rejection
   - Provides contact information for appeals

### Key Features

- **Bulk Operations**: Send notifications to multiple users efficiently
- **Rate Limiting**: Prevents overwhelming email services
- **Error Handling**: Graceful failure handling with detailed logging
- **Template System**: Consistent, professional email templates
- **Responsive Design**: Mobile-friendly email layouts
- **Tracking**: Optional database tracking for delivery status
- **Extensible**: Easy to add new notification types

## Usage

### Basic Usage

```typescript
import { useNotifications } from '@/hooks/use-notifications'

function MyComponent() {
  const { sendApprovalNotification, loading, error } = useNotifications()

  const handleApproval = async (user) => {
    const result = await sendApprovalNotification({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      type: 'approval'
    })

    if (result.success) {
      console.log('Notification sent successfully!')
    }
  }
}
```

### Bulk Notifications

```typescript
const { sendBulkApprovalNotifications } = useNotifications()

const handleBulkApproval = async (users) => {
  const notificationData = users.map(user => ({
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    type: 'approval'
  }))

  const results = await sendBulkApprovalNotifications(notificationData)
  
  const successCount = results.filter(r => r.success).length
  console.log(`${successCount} notifications sent successfully`)
}
```

### Direct Service Usage

```typescript
import { notificationService } from '@/lib/notification-service'

// Send individual notification
const result = await notificationService.sendApprovalNotification({
  userId: 'user-123',
  email: 'user@example.com',
  fullName: 'John Doe',
  type: 'approval'
})

// Send welcome notification
const welcomeResult = await notificationService.sendWelcomeNotification({
  userId: 'user-123',
  email: 'user@example.com',
  fullName: 'John Doe',
  type: 'welcome'
})
```

## Configuration

### Email Service Integration

The system is designed to work with various email service providers. To configure your email service:

1. **Update the API endpoint** (`app/api/notifications/send-email/route.ts`)
2. **Add your service credentials** to environment variables
3. **Implement the service-specific logic** in the `sendEmailViaService` function

#### Example: SendGrid Integration

```typescript
// In send-email/route.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

async function sendEmailViaService(emailData: EmailRequest) {
  const msg = {
    to: emailData.to,
    from: process.env.FROM_EMAIL!,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
  }
  
  const result = await sgMail.send(msg)
  return { messageId: result[0].headers['x-message-id'] }
}
```

#### Example: Resend Integration

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

async function sendEmailViaService(emailData: EmailRequest) {
  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  })
  
  return { messageId: result.data?.id || 'sent' }
}
```

### Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Email Service Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
# OR
RESEND_API_KEY=your-resend-api-key

# Email Settings
FROM_EMAIL=noreply@your-domain.com
SUPPORT_EMAIL=support@your-domain.com
COMPANY_NAME="Your Company Name"
```

### Template Customization

You can customize email templates by modifying the template functions in `lib/email-templates.ts`:

```typescript
// Customize the approval template
export function getApprovalEmailTemplate(data: TemplateData): EmailTemplate {
  return {
    subject: `Welcome to ${data.companyName}!`,
    html: `<!-- Your custom HTML template -->`,
    text: `Your custom text template`
  }
}
```

## Database Setup (Optional)

To enable notification tracking, run the migration:

```sql
-- Run this in your Supabase SQL editor
-- File: migrations/003_notifications_table.sql
```

This creates a `notifications` table that tracks:
- Notification delivery status
- Error messages for failed deliveries
- Timestamps for audit trails
- User associations for history

## Testing

### Development Testing

Use the `NotificationTest` component for development testing:

```typescript
import { NotificationTest } from '@/components/auth/notification-test'

// Add to your development page
<NotificationTest />
```

### Unit Testing

```typescript
import { notificationService } from '@/lib/notification-service'

describe('NotificationService', () => {
  it('should send approval notification', async () => {
    const result = await notificationService.sendApprovalNotification({
      userId: 'test-user',
      email: 'test@example.com',
      fullName: 'Test User',
      type: 'approval'
    })

    expect(result.success).toBe(true)
  })
})
```

## Error Handling

The notification system includes comprehensive error handling:

1. **Network Errors**: Automatic retry logic for transient failures
2. **Validation Errors**: Input validation with helpful error messages
3. **Service Errors**: Graceful handling of email service failures
4. **Rate Limiting**: Built-in protection against overwhelming services

### Error Recovery

- Failed notifications are logged for debugging
- The approval process continues even if notifications fail
- Users can be manually notified if automatic notifications fail

## Monitoring and Debugging

### Logging

The system provides detailed logging:

```typescript
// Console logs for development
console.log('📧 Sending approval notification to user@example.com')

// Error logs for debugging
console.error('Error sending notification:', error)
```

### Database Tracking

When enabled, the notifications table provides:
- Delivery status tracking
- Error message storage
- Performance metrics
- User notification history

### Health Checks

Monitor notification system health by checking:
- Email service API status
- Database connectivity (if tracking enabled)
- Recent notification success rates

## Security Considerations

1. **Email Validation**: All email addresses are validated before sending
2. **Rate Limiting**: Built-in protection against abuse
3. **Input Sanitization**: All user inputs are sanitized
4. **Service Keys**: Email service keys are stored securely in environment variables
5. **User Privacy**: Only necessary user data is included in notifications

## Performance Optimization

1. **Batch Processing**: Bulk notifications are processed in batches
2. **Rate Limiting**: Prevents overwhelming email services
3. **Async Processing**: Non-blocking notification sending
4. **Template Caching**: Email templates are efficiently generated
5. **Error Recovery**: Failed notifications don't block user approval

## Future Enhancements

Potential improvements for the notification system:

1. **SMS Notifications**: Add SMS support for critical notifications
2. **Push Notifications**: Browser push notifications for real-time updates
3. **Notification Preferences**: User-configurable notification settings
4. **Advanced Templates**: Dynamic template selection based on user preferences
5. **Analytics**: Detailed notification analytics and reporting
6. **Internationalization**: Multi-language email templates
7. **Scheduled Notifications**: Support for delayed/scheduled notifications

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check email service configuration
   - Verify API keys and credentials
   - Check network connectivity

2. **Template rendering issues**
   - Verify template data is complete
   - Check for HTML/CSS syntax errors
   - Test with different email clients

3. **Database tracking not working**
   - Ensure notifications table exists
   - Check database permissions
   - Verify Supabase connection

### Debug Mode

Enable debug mode by setting environment variable:

```bash
DEBUG_NOTIFICATIONS=true
```

This provides additional logging and error details.