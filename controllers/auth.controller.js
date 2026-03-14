import authService from '../services/auth.service.js';

class AuthController {
  async register(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
      }

      const user = await authService.register(username, password);
      const token = authService.generateToken({ id: user.id, username: user.username, role: user.role });

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.status(201).json({ success: true, user });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message || 'Ошибка регистрации' });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
      }

      const { user } = await authService.login(username, password);
      const token = authService.generateToken({ id: user.id, username: user.username, role: user.role });

      // If user is admin, set admin_token for backward compatibility via cookie, else auth_token
      if (user.role === 'admin') {
        res.cookie('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });
      } else {
        res.cookie('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });
      }

      res.json({ success: true, user, message: 'Вход выполнен' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message || 'Ошибка входа' });
    }
  }

  logout(req, res) {
    res.clearCookie('auth_token');
    res.clearCookie('admin_token');
    res.json({ success: true, message: 'Выход выполнен' });
  }

  me(req, res) {
    res.json({ success: true, user: req.user });
  }
}

export default new AuthController();
