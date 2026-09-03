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
  updateProductPrice: z.boolean().optional(),
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

    const trimmedName = body.name.trim();
    let resolvedProductId = body.productId || null;

    // Se não passou productId explicitamente, procura se existe produto com mesmo nome ou cadastra automaticamente
    if (!resolvedProductId && trimmedName) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          userId,
          name: {
            equals: trimmedName,
            mode: 'insensitive',
          },
        },
      });

      if (existingProduct) {
        resolvedProductId = existingProduct.id;
      } else {
        try {
          const newProduct = await prisma.product.create({
            data: {
              name: trimmedName,
              defaultPrice: body.price !== undefined ? body.price : null,
              defaultUnit: body.unit || 'un',
              categoryId: body.categoryId || null,
              userId,
            },
          });
          resolvedProductId = newProduct.id;
        } catch (productCreateErr) {
          console.warn('Não foi possível cadastrar o produto automaticamente:', productCreateErr);
        }
      }
    }

    const item = await prisma.listItem.create({
      data: {
        name: trimmedName,
        quantity: body.quantity,
        unit: body.unit,
        price: body.price,
        notes: body.notes,
        listId,
        productId: resolvedProductId,
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

    const { updateProductPrice, ...itemFields } = body;

    let resolvedProductId = itemFields.productId !== undefined ? itemFields.productId : item.productId;

    // Se o preço foi informado e a flag updateProductPrice não for explicitamente falsa
    if (itemFields.price !== undefined && itemFields.price !== null && updateProductPrice !== false) {
      const targetName = (itemFields.name || item.name).trim();

      if (resolvedProductId) {
        try {
          await prisma.product.update({
            where: { id: resolvedProductId },
            data: { defaultPrice: itemFields.price },
          });
        } catch (prodUpdateErr) {
          console.warn('Erro ao atualizar preço do produto existente:', prodUpdateErr);
        }
      } else if (targetName) {
        // Se não possui productId associado, procura produto por nome ou cria
        try {
          const existingProduct = await prisma.product.findFirst({
            where: {
              userId,
              name: {
                equals: targetName,
                mode: 'insensitive',
              },
            },
          });

          if (existingProduct) {
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: { defaultPrice: itemFields.price },
            });
            resolvedProductId = existingProduct.id;
          } else {
            const newProduct = await prisma.product.create({
              data: {
                name: targetName,
                defaultPrice: itemFields.price,
                defaultUnit: itemFields.unit || item.unit || 'un',
                categoryId: itemFields.categoryId !== undefined ? itemFields.categoryId : item.categoryId,
                userId,
              },
            });
            resolvedProductId = newProduct.id;
          }
        } catch (autoProdErr) {
          console.warn('Não foi possível sincronizar o produto no catálogo:', autoProdErr);
        }
      }
    }

    const updatedItem = await prisma.listItem.update({
      where: { id },
      data: {
        ...itemFields,
        categoryId: itemFields.categoryId !== undefined ? itemFields.categoryId : item.categoryId,
        productId: resolvedProductId,
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
