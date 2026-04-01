import { Request, Response } from 'express';
import User from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail';
import crypto from 'crypto';
import logger from '../utils/logger';

class AuthController {
  // handles new user registration
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role } = req.body;
      logger.info(`Registration attempt: ${JSON.stringify({ name, email, phone, role })}`);

      // check if email already taken
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }
      // check if phone already taken
      const existingByPhone = await User.findOne({ phone });
      if (existingByPhone) {
        return res.status(400).json({ success: false, message: 'An account with this phone number already exists.' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      // Create user — role defaults to 'user' unless explicitly set to 'admin'
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
          logger.error('Email sending failed during registration');
        }

        res.status(201).json({
          success: true,
          message: 'Registration successful. Please check your email for your verification OTP.',
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
      res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
    }
  }

  // logic for login
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      
      if (user) {
        const match = await user.comparePassword(password);
        
        if (!match) {
          logger.info(`Login failed for: ${email} - Password mismatch`);
          return res.status(401).json({ success: false, message: 'Bad credentials, try again' });
        }
      } else {
        logger.info(`Login failed: ${email} - User not found`);
        return res.status(401).json({ success: false, message: 'Bad credentials, try again' });
      }

      if (!user.isVerified) {
        return res.status(403).json({ success: false, message: 'Your account is not verified. Please check your email for the OTP.' });
      }

      this.sendTokenResponse(user, 200, res);
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Login error: ' + error.message });
    }
  }

  // Get token from model, create cookie and send response
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
      // Access token cookie - short life
      .cookie('accessToken', accessToken, {
        ...commonOptions,
        expires: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
      })
      // Refresh token cookie - long life
      .cookie('refreshToken', refreshToken, {
        ...commonOptions,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      })
      // Keep old 'token' cookie for compatibility (or transition it to access token)
      .cookie('token', accessToken, commonOptions)
      .json({
        success: true,
        accessToken,
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

  // refresh token - issue new access token from refresh token
  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    try {
      const decoded = jwt.verify(refreshToken, (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string) as any;
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
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
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
  }

  // logout - clear everything
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

  // verifying email with OTP
  async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
      }

      const user = await User.findOne({
        email,
        verificationOTP: otp,
        verificationOTPExpire: { $gt: new Date() }
      }).select('+password');

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      user.isVerified = true;
      user.verificationOTP = undefined;
      user.verificationOTPExpire = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Account verified successfully. You can now log in.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Verification error: ' + error.message });
    }
  }

  // resend OTP
  async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email, isVerified: false }).select('+password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found or already verified' });
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

      res.status(200).json({ success: true, message: 'New OTP sent to email' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Resend OTP error: ' + error.message });
    }
  }

  // forgot password - send reset link
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);

      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (!process.env.FRONTEND_URL) {
        logger.warn('FRONTEND_URL is not defined in environment variables. Falling back to localhost.');
      }

      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
      const message = `You requested a password reset. Please click: ${resetUrl}`;
      const html = `
        <h1>Password Reset</h1>
        <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
        <a href="${resetUrl}" style="padding: 10px 20px; background-color: #c7004c; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      `;

      try {
        await sendEmail({ email: user.email, subject: 'Password Reset - SHIELD', message, html });
        res.status(200).json({ success: true, message: 'Reset email sent' });
      } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(500).json({ success: false, message: 'Couldn\'t send email' });
      }
    } catch (error: any) {
      logger.error(`Forgot Password Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Forgot password error: ' + error.message });
    }
  }

  // reset password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token } = req.query;
      const { password } = req.body;

      const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: new Date() }
      }).select('+password');

      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error: any) {
      logger.error(`Reset Password Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Reset password error: ' + error.message });
    }
  }

  // get logged-in user's profile
  async getMe(req: any, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Couldn\'t find that user' });
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
      res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  }
}

export default new AuthController();
