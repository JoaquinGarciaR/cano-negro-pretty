import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cano_negro_pretty_secret_jwt_key_2026_cozy_salon';

export interface AuthUser {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  businessId: string;
  professionalId?: string | null;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ error: 'No autorizado: Sesión no encontrada' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(role: 'OWNER' | 'STAFF') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (role === 'OWNER' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Propietaria' });
    }
    next();
  };
}
