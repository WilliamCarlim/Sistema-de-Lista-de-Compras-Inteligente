import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getReports(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.userId!;
    const period = (req.query.period as string) || 'all';
    const yearParam = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    // Buscar anos distintos com listas cadastradas pelo usuário
    const allUserLists = await prisma.shoppingList.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const yearsSet = new Set<number>();
    allUserLists.forEach((l) => yearsSet.add(new Date(l.createdAt).getFullYear()));
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    const whereClause: any = { userId };

    if (period !== 'all') {
      let targetYear = yearParam || new Date().getFullYear();
      let targetMonth: number | undefined;

      if (period.includes('-')) {
        const [yStr, mStr] = period.split('-');
        targetYear = parseInt(yStr, 10);
        targetMonth = parseInt(mStr, 10);
      } else {
        const parsed = parseInt(period, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
          targetMonth = parsed;
        }
      }

      if (targetMonth !== undefined) {
        const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
        whereClause.createdAt = { gte: startDate, lt: endDate };
      }
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
    let totalItemsInLists = 0;     // soma da quantidade de todos os itens (comprados ou não)
    let totalProductsInLists = 0;  // total de produtos cadastrados nas listas
    let totalItemsBought = 0;      // soma da quantidade apenas dos comprados
    let totalProductsBought = 0;   // total de produtos comprados
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
        const itemQuantity = item.quantity || 1;
        const itemEstimatedTotal = itemQuantity * (item.price || 0);
        listEstimated += itemEstimatedTotal;
        totalEstimated += itemEstimatedTotal;

        // Contabiliza em todos os itens adicionados (comprados ou não)
        totalItemsInLists += itemQuantity;
        totalProductsInLists += 1;

        if (item.bought) {
          const itemCost = itemQuantity * (item.price || 0);
          listSpent += itemCost;
          totalSpent += itemCost;
          listBoughtCount += 1;
          totalItemsBought += itemQuantity;
          totalProductsBought += 1;
          monthData.totalSpent += itemCost;
          monthData.itemsCount += itemQuantity;

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
          catEntry.itemsCount += itemQuantity;

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
          prodEntry.totalQuantity += itemQuantity;
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
        itemsCount: Number(cat.itemsCount.toFixed(2)),
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
      availableYears,
      summary: {
        totalSpent,
        totalEstimated,
        totalBudget,
        budgetSavings,
        totalLists,
        completedLists,
        activeLists,
        totalItemsInLists: Number(totalItemsInLists.toFixed(2)),
        totalProductsInLists,
        totalItemsBought: Number(totalItemsBought.toFixed(2)),
        totalProductsBought,
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
