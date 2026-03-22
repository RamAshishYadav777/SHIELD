import sgMail from '@sendgrid/mail';
import logger from './logger';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const sendEmail = async (options: EmailOptions) => {
  if (!process.env.SENDGRID_API_KEY) {
    logger.error('SENDGRID_API_KEY is missing. Email will not be sent.');
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    await sgMail.send({
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'ashisk1234567@gmail.com',
        name: 'SHIELD Safety System'
      },
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message}</p>`,
    });
    logger.info(`Email sent via SendGrid to ${options.email}`);
  } catch (error: any) {
    const errMsg = error?.response?.body?.errors?.[0]?.message || error.message;
    logger.error(`Error sending email: ${errMsg}`);
    throw new Error('Email could not be sent');
  }
};

export default sendEmail;
