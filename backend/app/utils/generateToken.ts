import jwt from 'jsonwebtoken';

export const generateAccessToken = (id: string): string => {
  return jwt.sign({ id }, (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET) as string, {
    expiresIn: '15m'
  });
};

export const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string, {
    expiresIn: '7d'
  });
};

const generateToken = generateAccessToken;
export default generateToken;
