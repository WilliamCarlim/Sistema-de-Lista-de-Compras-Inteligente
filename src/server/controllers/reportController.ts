import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getReports(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const period = (req.query.period as string) || 'all';

    let dateFilter: Date | undefined;
    const now = new Date();

    if (period === '30d') {
      dateFilter = new Date();
      dateFilter.setDate(now.getDate() - 30);
    } else if (period === '90d') {
      dateFilter = new Date();
      dateFilter.setDate(now.getDate() - 90);
    } else if (period === '180d') {
      dateFilter = new Date();
      dateFilter.setDate(now.getDate() - 180);
    } else if (period === 'year') {
      dateFilter = new Date();
      dateFilter.setFullYear(now.getFullYear() - 1);
    }

    const whereClause: any = { userId };
    if (dateFilter) {
      whereClause.createdAt = { gte: dateFilter };
    }

    const lists = await prisma.shoppingList.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            category: true,
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Totais e KPIs
    let totalSpent = 0;
    let totalEstimated = 0;
    let totalItemsBought = 0;
    let totalBudget = 0;
    let completedLists = 0;
    let activeLists = 0;

    // Agrupamento por Categoria
    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        color: string;
        totalSpent: number;
        itemsCount: number;
      }
    >();

    // Agrupamento por Mês
    const monthMap = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        totalSpent: number;
        listCount: number;
        itemsCount: number;
        sortDate: Date;
      }
    >();

    // Agrupamento por Produto
    const productMap = new Map<
      string,
      {
        name: string;
        unit: string;
        categoryName: string;
        categoryColor: string;
        totalSpent: number;
        totalQuantity: number;
        purchaseCount: number;
      }
    >();

    // Desempenho por Lista
    const listPerformance: any[] = [];

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    for (const list of lists) {
      if (list.status === 'COMPLETED') completedLists++;
      else if (list.status === 'ACTIVE') activeLists++;

      if (list.budget) totalBudget += list.budget;

      let listSpent = 0;
      let listEstimated = 0;
      let listBoughtCount = 0;

      // Mês da lista
      const listDate = new Date(list.createdAt);
      const year = listDate.getFullYear();
      const month = listDate.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthLabel = `${monthNames[month]}/${String(year).slice(-2)}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthLabel,
          totalSpent: 0,
          listCount: 0,
          itemsCount: 0,
          sortDate: new Date(year, month, 1),
        });
      }
      const monthData = monthMap.get(monthKey)!;
      monthData.listCount += 1;

      for (const item of list.items) {
        const itemEstimatedTotal = (item.quantity || 1) * (item.price || 0);
        listEstimated += itemEstimatedTotal;
        totalEstimated += itemEstimatedTotal;

        if (item.bought) {
          const itemCost = (item.quantity || 1) * (item.price || 0);
          listSpent += itemCost;
          totalSpent += itemCost;
          listBoughtCount += 1;
          totalItemsBought += 1;
          monthData.totalSpent += itemCost;
          monthData.itemsCount += 1;

          // Categoria
          const catId = item.category?.id || 'uncategorized';
          const catName = item.category?.name || 'Sem Categoria';
          const catColor = item.category?.color || '#94a3b8';

          if (!categoryMap.has(catId)) {
            categoryMap.set(catId, {
              id: catId,
              name: catName,
              color: catColor,
              totalSpent: 0,
              itemsCount: 0,
            });
          }
          const catEntry = categoryMap.get(catId)!;
          catEntry.totalSpent += itemCost;
          catEntry.itemsCount += 1;

          // Produto
          const prodKey = item.name.toLowerCase().trim();
          if (!productMap.has(prodKey)) {
            productMap.set(prodKey, {
              name: item.name.trim(),
              unit: item.unit || 'un',
              categoryName: item.category?.name || 'Geral',
              categoryColor: item.category?.color || '#94a3b8',
              totalSpent: 0,
              totalQuantity: 0,
              purchaseCount: 0,
            });
          }
          const prodEntry = productMap.get(prodKey)!;
          prodEntry.totalSpent += itemCost;
          prodEntry.totalQuantity += item.quantity || 1;
          prodEntry.purchaseCount += 1;
        }
      }

      const isOverBudget = list.budget ? listSpent > list.budget : false;
      const difference = list.budget ? list.budget - listSpent : null;

      listPerformance.push({
        id: list.id,
        title: list.title,
        status: list.status,
        createdAt: list.createdAt,
        budget: list.budget,
        totalSpent: listSpent,
        totalEstimated: listEstimated,
        totalItems: list.items.length,
        boughtItems: listBoughtCount,
        isOverBudget,
        difference,
      });
    }

    // Processar Categorias com percentual
    const byCategory = Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: totalSpent > 0 ? Number(((cat.totalSpent / totalSpent) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    // Processar Mês ordenado cronologicamente
    const byMonth = Array.from(monthMap.values()).sort(
      (a, b) => a.sortDate.getTime() - b.sortDate.getTime()
    );

    // Processar Top Produtos
    const allProducts = Array.from(productMap.values());
    const topProductsBySpent = [...allProducts]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const topProductsByQuantity = [...allProducts]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const totalLists = lists.length;
    const avgSpentPerList = totalLists > 0 ? Number((totalSpent / totalLists).toFixed(2)) : 0;
    const budgetSavings = totalBudget > 0 ? Number((totalBudget - totalSpent).toFixed(2)) : 0;

    return res.json({
      period,
      summary: {
        totalSpent,
        totalEstimated,
        totalBudget,
        budgetSavings,
        totalLists,
        completedLists,
        activeLists,
        totalItemsBought,
        avgSpentPerList,
      },
      byCategory,
      byMonth,
      topProductsBySpent,
      topProductsByQuantity,
      listPerformance,
    });
  } catch (error) {
    console.error('Erro ao gerar relatórios:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar relatórios.' });
  }
}
