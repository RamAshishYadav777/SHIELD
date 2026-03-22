import transporter from '../config/mailConfig';
import logger from './logger';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const sendEmail = async (options: EmailOptions) => {

  const mailOptions = {
    from: `"SHIELD System" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
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
