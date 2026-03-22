import transporter from '../config/mailConfig';
import logger from './logger';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const sendEmail = async (options: EmailOptions) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.error('SMTP credentials missing (SMTP_USER / SMTP_PASS). Email will not be sent.');
    return;
  }

  const mailOptions = {
    from: `"SHIELD Safety System" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
    headers: {
      'X-Priority': '1',           // Mark as highest priority
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'X-Mailer': 'SHIELD Safety Platform',
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
  } catch (error: any) {
    logger.error(`Error sending email: ${error.message}`);
    throw new Error('Email could not be sent');
  }
};

export default sendEmail;
