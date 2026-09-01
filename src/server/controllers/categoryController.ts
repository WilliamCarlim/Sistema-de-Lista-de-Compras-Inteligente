import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const categorySchema = z.object({
  name: z.string().min(1, 'O nome da categoria é obrigatório'),
  color: z.string().optional().nullable(),
});

export async function getCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;

    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        _count: {
          select: { products: true, items: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(categories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar categorias.' });
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const body = categorySchema.parse(req.body);

    const exists = await prisma.category.findFirst({
      where: { name: body.name, userId },
    });

    if (exists) {
      return res.status(400).json({ error: 'Você já possui uma categoria com este nome.' });
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        color: body.color || '#10B981',
        userId,
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const body = categorySchema.parse(req.body);

    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    // Se mudou o nome, verifica se não colide com outra categoria do mesmo usuário
    if (body.name !== category.name) {
      const duplicate = await prisma.category.findFirst({
        where: { name: body.name, userId, NOT: { id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Você já possui outra categoria com este nome.' });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        color: body.color || category.color,
      },
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar categoria.' });
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    await prisma.category.delete({
      where: { id },
    });

    return res.json({ message: 'Categoria excluída com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao excluir categoria.' });
  }
}
