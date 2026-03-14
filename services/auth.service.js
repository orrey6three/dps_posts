import { supabaseAdmin } from './db.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET || !ADMIN_PASSWORD) {
  throw new Error('Missing JWT_SECRET or ADMIN_PASSWORD in .env');
}

class AuthService {
  /**
   * Verify admin password
   */
  async verifyAdminPassword(password) {
    return password === ADMIN_PASSWORD;
  }

  /**
   * Generate JWT token
   */
  generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(username, password) {
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('Пользователь с таким именем уже существует');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{ username, password_hash, role: 'user' }])
      .select('id, username, role, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Login user
   */
  async login(username, password) {
    // First check if it's admin
    if (username === 'admin') {
      const isValidAdmin = await this.verifyAdminPassword(password);
      if (isValidAdmin) {
        return { user: { id: 'admin', username: 'admin', role: 'admin' } };
      }
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      throw new Error('Неверное имя пользователя или пароль');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Неверное имя пользователя или пароль');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }
}

export default new AuthService();
