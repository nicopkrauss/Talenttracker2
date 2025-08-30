import { NextRequest, NextResponse } from 'next/server'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text: string
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text }: EmailRequest = await request.json()

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and content (html or text)' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // For now, we'll implement a simple logging approach
    // In production, you would integrate with an email service like:
    // - Supabase Edge Functions with Resend/SendGrid
    // - AWS SES
    // - Mailgun
    // - SendGrid directly
    // - Nodemailer with SMTP

    console.log('📧 EMAIL NOTIFICATION:')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Content: ${text}`)
    console.log('---')

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // For development purposes, we'll return success
    // In production, you'd call your actual email service here
    const result = await sendEmailViaService({ to, subject, html, text })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Error sending email:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Send email via configured email service
 * This is where you'd integrate with your chosen email provider
 */
async function sendEmailViaService(emailData: EmailRequest): Promise<{ messageId: string }> {
  // Example integration patterns:

  // 1. Using Supabase Edge Functions (recommended for Supabase projects)
  /*
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData)
  })
  */

  // 2. Using SendGrid
  /*
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  const msg = {
    to: emailData.to,
    from: process.env.FROM_EMAIL,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
  }
  
  const result = await sgMail.send(msg)
  return { messageId: result[0].headers['x-message-id'] }
  */

  // 3. Using Resend (popular choice)
  /*
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  })
  
  return { messageId: result.data?.id || 'sent' }
  */

  // 4. Using Nodemailer with SMTP
  /*
  const nodemailer = require('nodemailer')
  
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  
  const result = await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
  })
  
  return { messageId: result.messageId }
  */

  // For development/demo purposes, simulate successful sending
  console.log(`📧 Simulating email send to ${emailData.to}`)
  
  return {
    messageId: `demo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to send emails.' },
    { status: 405 }
  )
}