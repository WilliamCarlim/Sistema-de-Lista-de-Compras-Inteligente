import { Request, Response } from 'express';
import { prisma } from '../prisma.js';

export async function getCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(categories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao carregar categorias.' });
  }
}
