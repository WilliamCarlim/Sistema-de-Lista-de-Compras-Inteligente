import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura';

const defaultCategories = [
  { name: 'Hortifrúti', color: '#22C55E' },
  { name: 'Carnes & Peixes', color: '#EF4444' },
  { name: 'Laticínios & Ovos', color: '#F59E0B' },
  { name: 'Bebidas', color: '#3B82F6' },
  { name: 'Limpeza', color: '#A855F7' },
  { name: 'Higiene', color: '#EC4899' },
  { name: 'Mercearia/Padaria', color: '#D97706' },
  { name: 'Congelados', color: '#06B6D4' },
];

const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('E-mail inválido').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres').optional(),
});

export async function register(req: Request, res: Response) {
  try {
    const body = registerSchema.parse(req.body);

    const userExists = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (userExists) {
      return res.status(400).json({ error: 'E-mail já está em uso.' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
      },
    });

    // Cria as categorias padrão para a conta do usuário
    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: {
          name: cat.name,
          color: cat.color,
          userId: user.id,
        },
      });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const body = updateProfileSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Se estiver atualizando email, checa se não pertence a outro usuário
    if (body.email && body.email !== user.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (emailInUse) {
        return res.status(400).json({ error: 'Este e-mail já está em uso por outra conta.' });
      }
    }

    let updatedPasswordHash = user.passwordHash;

    if (body.newPassword) {
      if (!body.currentPassword) {
        return res.status(400).json({ error: 'Informe a senha atual para alterá-la.' });
      }
      const isCurrentValid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return res.status(400).json({ error: 'Senha atual incorreta.' });
      }
      updatedPasswordHash = await bcrypt.hash(body.newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name || user.name,
        email: body.email || user.email,
        passwordHash: updatedPasswordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao atualizar perfil.' });
  }
}
