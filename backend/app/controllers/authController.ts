import { Request, Response } from 'express';
import User from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail';
import crypto from 'crypto';
import logger from '../utils/logger';

class AuthController {
  // user signup
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role } = req.body;
      logger.info(`signup attempt: ${email}`);

      // check if user already has an account
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        return res.status(400).json({ success: false, message: 'email already taken' });
      }

      const existingByPhone = await User.findOne({ phone });
      if (existingByPhone) {
        return res.status(400).json({ success: false, message: 'phone number already taken' });
      }

      // make a random 6 digit code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

      // save the user to db
      const user = await User.create({
        name,
        email,
        password,
        phone,
        role: role === 'admin' ? 'admin' : 'user',
        verificationOTP: otp,
        verificationOTPExpire: otpExpire
      });

      if (user) {
        const message = `Welcome to SHIELD. Your verification OTP is: ${otp}`;
        // email stuff
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #333; text-align: center;">Welcome to SHIELD</h1>
            <p>Your security is our priority. Please use the following One-Time Password (OTP) to verify your account:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff8c00;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">This OTP will expire in 10 minutes.</p>
          </div>
        `;

        try {
          await sendEmail({ email: user.email, subject: 'Account Verification - SHIELD', message, html });
        } catch (err) {
          logger.error('failed to send welcome email');
        }

        res.status(201).json({
          success: true,
          message: 'check your email for the code!',
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            contactSlots: user.contactSlots,
            createdAt: user.createdAt
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'something went wrong with signup' });
    }
  }

  // user login
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');

      if (user) {
        const match = await user.comparePassword(password);

        if (!match) {
          logger.info(`login failed: wrong password for ${email}`);
          return res.status(401).json({ success: false, message: 'invalid email or password' });
        }
      } else {
        logger.info(`login failed: user ${email} not found`);
        return res.status(401).json({ success: false, message: 'invalid email or password' });
      }

      // make sure they verified their email
      if (!user.isVerified) {
        return res.status(403).json({ success: false, message: 'please verify your account first' });
      }

      this.sendTokenResponse(user, 200, res);
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'login error occurred' });
    }
  }

  // function to handle sending the tokens
  private sendTokenResponse(user: any, statusCode: number, res: Response) {
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const commonOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    res
      .status(statusCode)
      // access token - expires fast
      .cookie('accessToken', accessToken, {
        ...commonOptions,
        expires: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
      })
      // refresh token - stays for a week
      .cookie('refreshToken', refreshToken, {
        ...commonOptions,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      })
      // old token cookie just in case
      .cookie('token', accessToken, commonOptions)
      .json({
        success: true,
        accessToken,
        token: accessToken, // for backward compatibility in frontend
        refreshToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          contactSlots: user.contactSlots,
          createdAt: user.createdAt
        }
      });
  }

  // get a new access token using the refresh token
  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'no refresh token found' });
    }

    try {
      const secret = (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string;
      const decoded = jwt.verify(refreshToken, secret) as any;
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ success: false, message: 'user not found' });
      }

      const newAccessToken = generateAccessToken(user._id.toString());

      res
        .status(200)
        .cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          expires: new Date(Date.now() + 15 * 60 * 1000)
        })
        .cookie('token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        })
        .json({ success: true, accessToken: newAccessToken });

    } catch (err) {
      return res.status(401).json({ success: false, message: 'token expired or invalid' });
    }
  }

  // log user out and clear all cookies
  async logout(req: Request, res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const clearOptions: any = {
      httpOnly: true,
      expires: new Date(0),
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/'
    };

    res.cookie('token', 'none', clearOptions);
    res.cookie('accessToken', 'none', clearOptions);
    res.cookie('refreshToken', 'none', clearOptions);

    res.status(200).json({
      success: true,
      data: {}
    });
  }

  // verify the code sent to email
  async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'missing email or code' });
      }

      const user = await User.findOne({
        email,
        verificationOTP: otp,
        verificationOTPExpire: { $gt: new Date() }
      }).select('+password');

      if (!user) {
        return res.status(400).json({ success: false, message: 'invalid or expired code' });
      }

      user.isVerified = true;
      user.verificationOTP = undefined;
      user.verificationOTPExpire = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'email verified! you can login now.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'verification failed' });
    }
  }

  // send the code again if they didn't get it
  async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email, isVerified: false }).select('+password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'user not found or already verified' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationOTP = otp;
      user.verificationOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendEmail({
        email: user.email,
        subject: 'Resend Verification OTP - SHIELD',
        message: `Your new verification OTP is: ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #333; text-align: center;">SHIELD Verification</h1>
            <p>You requested a new OTP. Please use the following One-Time Password:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff8c00;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">This OTP will expire in 10 minutes.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, message: 'sent a new code to your email' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'failed to resend code' });
    }
  }

  // forgot password sender
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(200).json({ success: true, message: 'if that email exists, check your inbox' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);

      await user.save();

      let frontendUrl = process.env.FRONTEND_URL;

      if (!frontendUrl) {
        const origin = req.get('origin');
        const referer = req.get('referer');

        if (origin) {
          frontendUrl = origin;
        } else if (referer) {
          try {
            const refUrl = new URL(referer);
            frontendUrl = `${refUrl.protocol}//${refUrl.host}`;
          } catch (e) {
            frontendUrl = 'http://localhost:3000';
          }
        } else {
          frontendUrl = 'http://localhost:3000';
          logger.warn('FRONTEND_URL not found, using localhost');
        }
      }

      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
      const message = `You requested a password reset. Please click: ${resetUrl}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
          <p>We received a request to reset your password for your SHIELD account. Click the button below to proceed. This link will expire in 30 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="padding: 14px 28px; background-color: #ff8c00; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset My Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">SHIELD - Advanced Security Protocol</p>
        </div>
      `;

      try {
        await sendEmail({ email: user.email, subject: 'Password Reset - SHIELD', message, html });
        res.status(200).json({ success: true, message: 'check email for reset link' });
      } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(500).json({ success: false, message: 'failed to send email' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'forgot password error' });
    }
  }

  // set the new password
  async resetPassword(req: Request, res: Response) {
    try {
      const token = req.query.token;
      const { password } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ success: false, message: 'invalid token' });
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: new Date() }
      }).select('+password');

      if (!user) {
        return res.status(400).json({ success: false, message: 'token expired or bad' });
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(200).json({ success: true, message: 'password changed successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'failed to reset password' });
    }
  }

  // get my info
  async getMe(req: any, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'user not found' });
      }
      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          contactSlots: user.contactSlots,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'error getting profile' });
    }
  }
}

export default new AuthController();
