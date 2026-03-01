import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET || !ADMIN_PASSWORD) {
  throw new Error('Missing JWT_SECRET or ADMIN_PASSWORD in .env');
}

/**
 * Verify admin password
 */
export async function verifyAdminPassword(password) {
  return password === ADMIN_PASSWORD;
}

/**
 * Generate JWT token
 */
export function generateToken() {
  return jwt.sign(
    { role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Auth middleware
 */
export function requireAuth(req, res, next) {
  const token = req.cookies.admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
  
  req.admin = decoded;
  next();
}
