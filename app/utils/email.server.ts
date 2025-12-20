import { SMTPClient } from "emailjs";

/**
 * Modern, runtime-agnostic SMTP utility using emailjs.
 * Works on Node.js, Bun, Cloudflare Workers, etc.
 * Supports Gmail App Passwords and standard SMTP services.
 */

const getClient = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;

  if (!user || !password) {
    return null;
  }

  return new SMTPClient({
    user,
    password,
    host,
    ssl: port === 465,
    tls: port === 587 || port === 25,
  });
};

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  // Skip email sending in test environments
  if (process.env.NODE_ENV === 'test' || process.env.E2E_TEST === 'true') {
    console.log(`📧 [TEST MODE] Skipping email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    return { success: true, testMode: true };
  }

  const client = getClient();
  const from = process.env.EMAIL_FROM || `Groove <${process.env.SMTP_USER}>`;

  if (!client) {
    console.warn("SMTP credentials are not set. Skipping email.");
    return;
  }

  try {
    const message = await client.sendAsync({
      text: html.replace(/<[^>]*>?/gm, ""), // Simple plain text fallback
      from,
      to,
      subject,
      attachment: [{ data: html, alternative: true }],
    });
    return message;
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

// Groove logo as inline SVG for emails (Kanban columns with colored cards)
const grooveLogoSvg = `<svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Column 1 (Todo - Blue card) -->
  <rect x="3" y="10" width="6" height="18" rx="3" fill="#F1F5F9"/>
  <rect x="4" y="12" width="4" height="6" rx="1.5" fill="#3B82F6"/>
  <!-- Column 2 (In Progress - Purple & Pink cards) -->
  <rect x="12" y="4" width="6" height="24" rx="3" fill="#F1F5F9"/>
  <rect x="13" y="6" width="4" height="8" rx="1.5" fill="#8B5CF6"/>
  <rect x="13" y="16" width="4" height="6" rx="1.5" fill="#EC4899"/>
  <!-- Column 3 (Done - Green card with checkmark) -->
  <rect x="21" y="8" width="6" height="20" rx="3" fill="#F1F5F9"/>
  <rect x="22" y="10" width="4" height="10" rx="1.5" fill="#10B981"/>
  <path d="M23 15L24 16L26 14" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: "Welcome to Groove!",
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
          ${grooveLogoSvg}
          <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 16px 0 8px 0; letter-spacing: -0.025em;">Welcome to Groove</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">Find your rhythm. Organize your projects.</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Hi ${name}, welcome aboard! 🎯</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            We're excited to have you join our community. Groove is your new home for organizing projects with style and efficiency.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.APP_URL || "http://localhost:5173"}/home"
               style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3);">
              🚀 Go to Your Dashboard
            </a>
          </div>
        </div>
      </div>
    `,
  }),
  invitation: (
    boardName: string,
    inviterName: string,
    invitationId: string
  ) => ({
    subject: `You've been invited to collaborate on ${boardName}`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
          ${grooveLogoSvg}
          <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 16px 0 8px 0; letter-spacing: -0.025em;">Groove</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">Project Management with Rhythm</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">You're invited to join! 🎯</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">
            <strong>${inviterName}</strong> has invited you to collaborate on the board:
          </p>
          <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 6px;">
            <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0;">${boardName}</h3>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.APP_URL || "http://localhost:5173"}/invite?id=${invitationId}"
               style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.3);">
              ✅ Accept Invitation
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
            This invitation will expire in 7 days. <a href="#" style="color: #3b82f6; text-decoration: underline;">Learn more about Groove</a>.
          </p>
        </div>
      </div>
    `,
  }),
  joined: (boardName: string) => ({
    subject: `Welcome to ${boardName} - You're all set!`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
          ${grooveLogoSvg}
          <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 16px 0 8px 0; letter-spacing: -0.025em;">Groove</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">You're officially part of the team!</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Welcome aboard! 🎉</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            You've successfully joined the board and are now part of the team working on:
          </p>
          <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 6px;">
            <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0;">${boardName}</h3>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.APP_URL || "http://localhost:5173"}/home"
               style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3);">
              🚀 View Your Board
            </a>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
              💡 <strong>Pro tip:</strong> Start by adding some cards to your board and organizing them into columns. Use the keyboard shortcut 'c' to quickly add new cards!
            </p>
          </div>
        </div>
      </div>
    `,
  }),
};
