import { Request, Response } from 'express';
import User from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail';
import crypto from 'crypto';
import logger from '../utils/logger';

class AuthController {
  // register a new account
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role } = req.body;
      logger.info(`signup attempt: ${email}`);

      // make sure email/phone aren't already used
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        return res.status(400).json({ success: false, message: 'email already taken' });
      }

      const existingByPhone = await User.findOne({ phone });
      if (existingByPhone) {
        return res.status(400).json({ success: false, message: 'phone number already taken' });
      }

      // 6 digit code for email verification
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
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #333; text-align: center;">Welcome to SHIELD</h1>
            <p>Your security is our priority. Please use the following code to verify your account:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff8c00;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">This code will expire in 10 minutes.</p>
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

  // login existing user
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

      // check if verified and not blocked
      if (!user.isVerified) {
        return res.status(403).json({ success: false, message: 'please verify your account first' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ success: false, message: 'your account has been blocked' });
      }

      this.sendTokenResponse(user, 200, res);
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'login error occurred' });
    }
  }

  // helper to send cookies and response
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
      // save tokens in httpOnly cookies for security
      .cookie('accessToken', accessToken, {
        ...commonOptions,
        expires: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
      })
      .cookie('refreshToken', refreshToken, {
        ...commonOptions,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      .cookie('token', accessToken, commonOptions)
      .json({
        success: true,
        accessToken,
        token: accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          contactSlots: user.contactSlots,
          createdAt: user.createdAt,
          token: accessToken
        }
      });
  }

  // use refresh token to get new access token
  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'no refresh token found' });
    }

    try {
      const secret = (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string;
      const decoded = jwt.verify(refreshToken, secret) as any;
      const user = await User.findById(decoded.id);

      if (!user || user.isBlocked) {
        return res.status(401).json({ success: false, message: 'user not found or blocked' });
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

  // wipe cookies on logout
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

    res.status(200).json({ success: true, data: {} });
  }

  // verify the otp code
  async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({
        email,
        verificationOTP: otp,
        verificationOTPExpire: { $gt: new Date() }
      }).select('+password');

      if (!user) return res.status(400).json({ success: false, message: 'invalid or expired code' });

      user.isVerified = true;
      user.verificationOTP = undefined;
      user.verificationOTPExpire = undefined;
      await user.save();

      res.status(200).json({ success: true, message: 'email verified! you can login now.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'verification failed' });
    }
  }

  // get user profile
  async getMe(req: any, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'user not found' });

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

  // send a new otp if the old one expired
  async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) return res.status(404).json({ success: false, message: 'no user with that email' });
      if (user.isVerified) return res.status(400).json({ success: false, message: 'already verified' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationOTP = otp;
      user.verificationOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendEmail({
        email: user.email,
        subject: 'New Verification Code',
        message: `Your new code is: ${otp}`,
        html: `<b>${otp}</b>`
      });

      res.status(200).json({ success: true, message: 'new code sent!' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'failed to resend code' });
    }
  }

  // send password reset link
  async forgotPassword(req: Request, res: Response) {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) return res.status(404).json({ success: false, message: 'email not found' });

      const token = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
      user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || 'https://shield-gilt.vercel.app';
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #1a1a1a; border-radius: 12px; background-color: #000; color: #fff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://shield-gilt.vercel.app/shield_v10.png" alt="SHIELD Logo" style="width: 60px; height: 60px;" />
            <h1 style="color: #fff; text-align: center; font-size: 24px; font-weight: 900; letter-spacing: 2px; margin-top: 20px; text-transform: uppercase;">Password Reset</h1>
          </div>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; text-align: center;">We received a request to reset the password for your SHIELD account. Click the button below to establish a new secure password.</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 16px 36px; background: linear-gradient(90deg, #f4821f, #e83a8b); color: #fff; text-decoration: none; font-size: 14px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; border-radius: 8px; box-shadow: 0 10px 30px rgba(244,130,31,0.3);">
              Reset Password
            </a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">This link will securely expire in 10 minutes.<br/>If you did not make this request, please safely ignore this email.</p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: 'SHIELD - Password Reset Request',
        message: `Reset your password here: ${resetUrl}`,
        html
      });

      res.status(200).json({ success: true, message: 'reset link sent to email' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'could not send reset email' });
    }
  }

  // update password using the reset token
  async resetPassword(req: Request, res: Response) {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).json({ success: false, message: 'missing password reset token' });

      const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: new Date() }
      });

      if (!user) return res.status(400).json({ success: false, message: 'invalid or expired token' });

      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(200).json({ success: true, message: 'password updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'failed to reset password' });
    }
  }
}

export default new AuthController();
