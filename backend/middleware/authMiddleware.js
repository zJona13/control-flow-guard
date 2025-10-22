import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

// Middleware para verificar JWT
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    
    req.user = user; // { id, email, area }
    next();
  });
};

// Middleware para verificar roles específicos
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.area)) {
      return res.status(403).json({ 
        error: 'No tiene permisos para realizar esta acción',
        requiredRoles: allowedRoles,
        userRole: req.user.area
      });
    }

    next();
  };
};

// Middleware para verificar si el usuario tiene al menos uno de los roles
export const requireAnyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.area)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

export default { authenticateToken, requireRole, requireAnyRole };

