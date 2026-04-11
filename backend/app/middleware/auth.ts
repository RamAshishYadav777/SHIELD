import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

// middleware to protect routes - checks for token
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  // look for token in header or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && (req.cookies.accessToken || req.cookies.token)) {
    token = req.cookies.accessToken || req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'not authorized' });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret as string) as any;
    
    // find user and attach to req
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'user not found' });
    }

    // check if user is blocked
    if (req.user.isBlocked) {
      return res.status(403).json({ success: false, message: 'your account is blocked' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'invalid token' });
  }
};

// middleware for role based access
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'you dont have permission for this'
      });
    }
    next();
  };
};
