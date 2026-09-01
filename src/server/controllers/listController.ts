import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const listCreateSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  description: z.string().optional().nullable(),
  budget: z.number().nonnegative('O orçamento não pode ser negativo').optional().nullable(),
});

const listUpdateSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório').optional(),
  description: z.string().optional().nullable(),
  budget: z.number().nonnegative('O orçamento não pode ser negativo').optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
});

export async function getLists(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;

    const lists = await prisma.shoppingList.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const listsWithStats = lists.map((list) => {
      const totalItems = list.items.length;
      const boughtItems = list.items.filter((item) => item.bought).length;
      
      const totalSpent = list.items
        .filter((item) => item.bought)
        .reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);

      const totalEstimated = list.items
        .reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);

      return {
        id: list.id,
        title: list.title,
        description: list.description,
        budget: list.budget,
        status: list.status,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        totalItems,
        boughtItems,
        totalSpent,
        totalEstimated,
      };
    });

    return res.json(listsWithStats);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao buscar listas.' });
  }
}

export async function createList(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const body = listCreateSchema.parse(req.body);

    const list = await prisma.shoppingList.create({
      data: {
        title: body.title,
        description: body.description,
        budget: body.budget,
        userId,
      },
    });

    return res.status(201).json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao criar lista.' });
  }
}

export async function getListDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            category: true,
            product: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!list) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    return res.json(list);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao carregar detalhes da lista.' });
  }
}

export async function updateList(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const body = listUpdateSchema.parse(req.body);

    const listExists = await prisma.shoppingList.findFirst({
      where: { id, userId },
    });

    if (!listExists) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    const updatedList = await prisma.shoppingList.update({
      where: { id },
      data: body,
    });

    return res.json(updatedList);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao atualizar lista.' });
  }
}

export async function deleteList(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const listExists = await prisma.shoppingList.findFirst({
      where: { id, userId },
    });

    if (!listExists) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    await prisma.shoppingList.delete({
      where: { id },
    });

    return res.json({ message: 'Lista deletada com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao deletar lista.' });
  }
}

export async function getListSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const list = await prisma.shoppingList.findFirst({
      where: { id, userId },
      include: {
        items: true,
      },
    });

    if (!list) {
      return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    const budget = list.budget || 0;
    
    const totalEstimated = list.items.reduce(
      (sum, item) => sum + (item.quantity * (item.price || 0)),
      0
    );

    const totalBought = list.items
      .filter((item) => item.bought)
      .reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);

    return res.json({
      budget,
      totalEstimated,
      totalBought,
      isOverBudget: budget > 0 && totalBought > budget,
      remaining: budget > 0 ? Math.max(0, budget - totalBought) : 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao calcular resumo.' });
  }
}
