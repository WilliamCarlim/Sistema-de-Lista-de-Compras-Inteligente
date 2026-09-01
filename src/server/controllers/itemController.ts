import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const itemCreateSchema = z.object({
  name: z.string().min(1, 'O nome do item é obrigatório'),
  quantity: z.number().positive('A quantidade deve ser maior que zero').default(1),
  unit: z.string().default('un'),
  price: z.number().nonnegative('O preço não pode ser negativo').optional().nullable(),
  categoryId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const itemUpdateSchema = z.object({
  name: z.string().min(1, 'O nome do item é obrigatório').optional(),
  quantity: z.number().positive('A quantidade deve ser maior que zero').optional(),
  unit: z.string().optional(),
  price: z.number().nonnegative('O preço não pode ser negativo').optional().nullable(),
  categoryId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  bought: z.boolean().optional(),
});

export async function addItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id: listId } = req.params;
    const body = itemCreateSchema.parse(req.body);

    const listExists = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    });

    if (!listExists) {
      return res.status(404).json({ error: 'Lista de compras não encontrada.' });
    }

    const item = await prisma.listItem.create({
      data: {
        name: body.name,
        quantity: body.quantity,
        unit: body.unit,
        price: body.price,
        notes: body.notes,
        listId,
        productId: body.productId || null,
        categoryId: body.categoryId || null,
      },
      include: {
        category: true,
        product: true,
      },
    });

    return res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao adicionar item.' });
  }
}

export async function toggleItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const item = await prisma.listItem.findUnique({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!item || item.list.userId !== userId) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    const updatedItem = await prisma.listItem.update({
      where: { id },
      data: {
        bought: !item.bought,
      },
      include: {
        category: true,
        product: true,
      },
    });

    return res.json(updatedItem);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao alternar estado do item.' });
  }
}

export async function updateItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const body = itemUpdateSchema.parse(req.body);

    const item = await prisma.listItem.findUnique({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!item || item.list.userId !== userId) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    const updatedItem = await prisma.listItem.update({
      where: { id },
      data: {
        ...body,
        categoryId: body.categoryId !== undefined ? body.categoryId : item.categoryId,
        productId: body.productId !== undefined ? body.productId : item.productId,
      },
      include: {
        category: true,
        product: true,
      },
    });

    return res.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao atualizar item.' });
  }
}

export async function deleteItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const item = await prisma.listItem.findUnique({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!item || item.list.userId !== userId) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    await prisma.listItem.delete({
      where: { id },
    });

    return res.json({ message: 'Item removido com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao remover item.' });
  }
}
