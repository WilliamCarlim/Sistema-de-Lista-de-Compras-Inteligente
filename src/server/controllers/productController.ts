import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const productSchema = z.object({
  name: z.string().min(1, 'O nome do produto é obrigatório'),
  defaultPrice: z.number().nonnegative('O preço não pode ser negativo').optional().nullable(),
  defaultUnit: z.string().default('un'),
  categoryId: z.string().optional().nullable(),
});

export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;

    const products = await prisma.product.findMany({
      where: { userId },
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar produtos.' });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const body = productSchema.parse(req.body);

    const exists = await prisma.product.findFirst({
      where: { name: body.name, userId },
    });

    if (exists) {
      return res.status(400).json({ error: 'Você já possui um produto cadastrado com este nome.' });
    }

    if (body.categoryId) {
      const categoryExists = await prisma.category.findFirst({
        where: { id: body.categoryId, userId },
      });
      if (!categoryExists) {
        return res.status(400).json({ error: 'Categoria inválida ou não encontrada.' });
      }
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        defaultPrice: body.defaultPrice,
        defaultUnit: body.defaultUnit,
        categoryId: body.categoryId || null,
        userId,
      },
      include: {
        category: true,
      },
    });

    return res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar produto.' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const body = productSchema.parse(req.body);

    const product = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (body.name !== product.name) {
      const duplicate = await prisma.product.findFirst({
        where: { name: body.name, userId, NOT: { id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Você já possui outro produto cadastrado com este nome.' });
      }
    }

    if (body.categoryId) {
      const categoryExists = await prisma.category.findFirst({
        where: { id: body.categoryId, userId },
      });
      if (!categoryExists) {
        return res.status(400).json({ error: 'Categoria inválida ou não encontrada.' });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        defaultPrice: body.defaultPrice,
        defaultUnit: body.defaultUnit,
        categoryId: body.categoryId || null,
      },
      include: {
        category: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    await prisma.product.delete({
      where: { id },
    });

    return res.json({ message: 'Produto excluído com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao excluir produto.' });
  }
}
