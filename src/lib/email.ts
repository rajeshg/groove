import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/^["']|["']$/g, ""),
      },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = getTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}`);
  } catch (error: any) {
    console.error("Failed to send email:", error.message, error.stack);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

function getBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<void> {
  const baseUrl = getBaseUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Groove, ${firstName}!</h2>
      <p>Thank you for joining Groove. Your kanban board experience awaits.</p>
      <p>You can now create boards, invite team members, and start organizing your projects.</p>
      <a href="${baseUrl}/boards" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Your Boards</a>
      <p>If you have any questions, feel free to reach out.</p>
      <p>Best,<br>The Groove Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Welcome to Groove!",
    html,
  });
}

export async function sendBoardInvitationEmail(
  email: string,
  boardName: string,
  inviterName: string,
  inviteUrl: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited to join a board on Groove!</h2>
      <p>${inviterName} has invited you to collaborate on the board "${boardName}".</p>
      <p>Click the button below to accept the invitation and start collaborating:</p>
      <a href="${inviteUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
      <p>If you don't have an account yet, you'll be able to create one when you click the link.</p>
      <p>This invitation will expire in 7 days.</p>
      <p>Best,<br>The Groove Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Invitation to join "${boardName}" on Groove`,
    html,
  });
}
