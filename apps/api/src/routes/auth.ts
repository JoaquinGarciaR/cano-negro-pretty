import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'cano_negro_pretty_secret_jwt_key_2026_cozy_salon';

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { professional: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
      professionalId: user.professionalId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        professional: user.professional
      }
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Sesión cerrada exitosamente' });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { professional: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        professional: user.professional
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al recuperar perfil' });
  }
});
