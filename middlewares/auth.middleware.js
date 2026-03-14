import authService from '../services/auth.service.js';

export function requireAuth(req, res, next) {
  const token = req.cookies.auth_token || req.cookies.admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  
  const decoded = authService.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
  
  req.user = decoded;
  next();
}

export function optionalAuth(req, res, next) {
  const token = req.cookies.auth_token || req.cookies.admin_token;
  
  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

export function requireAdmin(req, res, next) {
  const token = req.cookies.admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация администратора' });
  }
  
  const decoded = authService.verifyToken(token);
  
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ error: 'Отказано в доступе' });
  }
  
  req.admin = decoded;
  req.user = decoded;
  next();
}
