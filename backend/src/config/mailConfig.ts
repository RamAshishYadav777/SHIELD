import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Mail transporter configuration.
 * Uses SMTP settings from the environment variables.
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  family: 4, // CRITICAL: Force IPv4 - Render's IPv6 cannot reach Gmail
  auth: {
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''),
  },
  tls: {
    rejectUnauthorized: false
  }
} as any);

// Verify SMTP config on startup so we can catch issues early in Render logs
transporter.verify((error) => {
  if (error) {
    console.error('[SMTP] Connection FAILED:', error.message);
  } else {
    console.log('[SMTP] Server is ready to send emails ✅');
  }
});

export default transporter;
