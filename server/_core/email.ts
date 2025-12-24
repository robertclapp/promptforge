import sgMail from "@sendgrid/mail";

/**
 * Email service using SendGrid
 * 
 * To use this service, set the SENDGRID_API_KEY environment variable
 * Get your API key from: https://app.sendgrid.com/settings/api_keys
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@promptforge.dev";
const APP_URL = process.env.VITE_APP_URL || "http://localhost:3000";

// Initialize SendGrid only if API key is provided
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  // If SendGrid is not configured, log to console instead
  if (!SENDGRID_API_KEY) {
    console.log("📧 Email would be sent (SendGrid not configured):");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.text || options.html}`);
    return true;
  }

  try {
    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Send team invitation email
 */
export async function sendInvitationEmail(
  email: string,
  teamName: string,
  inviterName: string,
  token: string,
  role: string
): Promise<boolean> {
  const inviteUrl = `${APP_URL}/accept-invitation?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .role-badge {
      display: inline-block;
      background: #f3f4f6;
      color: #374151;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      text-transform: capitalize;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">🚀 PromptForge</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join a team</p>
  </div>
  <div class="content">
    <p>Hi there,</p>
    <p><strong>${inviterName}</strong> has invited you to join the <strong>${teamName}</strong> team on PromptForge.</p>
    
    <p>You'll be joining as: <span class="role-badge">${role}</span></p>
    
    <p>PromptForge is an enterprise prompt engineering platform that helps teams build, test, and optimize AI prompts collaboratively.</p>
    
    <div style="text-align: center;">
      <a href="${inviteUrl}" class="button">Accept Invitation</a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Or copy and paste this link into your browser:<br>
      <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      <strong>Note:</strong> This invitation will expire in 7 days.
    </p>
  </div>
  <div class="footer">
    <p>This email was sent by PromptForge. If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
</body>
</html>
  `;

  const text = `
You've been invited to join ${teamName} on PromptForge!

${inviterName} has invited you to join as a ${role}.

Accept your invitation by clicking this link:
${inviteUrl}

This invitation will expire in 7 days.

---
PromptForge - Enterprise Prompt Engineering Platform
  `;

  return sendEmail({
    to: email,
    subject: `You've been invited to join ${teamName} on PromptForge`,
    html,
    text,
  });
}
