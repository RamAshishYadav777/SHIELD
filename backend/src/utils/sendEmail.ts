import { Resend } from 'resend';
import logger from './logger';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options: EmailOptions) => {
  if (!process.env.RESEND_API_KEY) {
    logger.error('RESEND_API_KEY is missing. Email will not be sent.');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'SHIELD Safety System <onboarding@resend.dev>',
      to: options.email,
      subject: options.subject,
      html: options.html || `<p>${options.message}</p>`,
    });

    if (error) {
      logger.error(`Resend API error: ${error.message}`);
      throw new Error(error.message);
    }

    logger.info(`Email sent via Resend: ${data?.id}`);
  } catch (error: any) {
    logger.error(`Error sending email: ${error.message}`);
    throw new Error('Email could not be sent');
  }
};

export default sendEmail;
