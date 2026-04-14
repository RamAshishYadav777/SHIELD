import jwt from 'jsonwebtoken';

// access token lasts 4 hours — long enough for a normal session
export const generateAccessToken = (id: string): string => {
  return jwt.sign({ id }, (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET) as string, {
    expiresIn: '4h'
  });
};

// makers for refresh token (long lived)
export const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string, {
    expiresIn: '7d'
  });
};

const generateToken = generateAccessToken;
export default generateToken;
