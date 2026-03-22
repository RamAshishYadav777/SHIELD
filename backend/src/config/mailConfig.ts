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
  secure: false, // Use STARTTLS on port 587
  requireTLS: true,
  auth: {
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''),
  },
  // CRITICAL: Force IPv4 to avoid ENETUNREACH on IPv6 (Render network issue)
  tls: {
    rejectUnauthorized: false
  }
} as any);
// Explicitly force IPv4 for the socket connection
(transporter as any).options.family = 4;

export default transporter;
