import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  Printer,
  PieChart,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { api, ReportsData } from '../services/api.ts';

const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [period, setPeriod] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productTab, setProductTab] = useState<'spent' | 'quantity'>('spent');

  const fetchReports = async (selectedPeriod: string, year?: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getReports(selectedPeriod, selectedPeriod !== 'all' ? year : undefined);
      setData(res);
      if (res.availableYears && res.availableYears.length > 0 && !res.availableYears.includes(selectedYear)) {
        setSelectedYear(res.availableYears[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(period, selectedYear);
  }, [period, selectedYear]);

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatQuantity = (qty?: number | null) => {
    if (qty === undefined || qty === null) return '0';
    return Number.isInteger(qty) ? qty.toString() : qty.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };

  const maxMonthSpent = data?.byMonth && data.byMonth.length > 0
    ? Math.max(...data.byMonth.map((m) => m.totalSpent), 1)
    : 1;

  const getPeriodLabel = () => {
    if (period === 'all') return 'Todo o Histórico (Geral)';
    const monthObj = MONTH_OPTIONS.find((m) => m.value === period);
    return `${monthObj?.label || period} de ${selectedYear}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 print:p-0 print:pb-0">
      {/* Printable Header */}
      <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Relatório de Compras & Finanças</h1>
            <p className="text-xs text-gray-600 mt-1">
              Período selecionado: <strong>{getPeriodLabel()}</strong>
            </p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Gerado em: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
            <p className="text-sm font-bold text-gray-900 mt-1">Total Geral: {formatCurrency(data?.summary.totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Screen Header & Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Relatórios & Análises</h1>
              <p className="text-xs text-gray-500 font-medium">
                Visão consolidada de gastos, categorias, evolução mensal e orçamento
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por Mês ou Todo o Histórico */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Todo o Histórico</option>
              <optgroup label="Filtrar por Mês">
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Seletor de Ano (apenas quando um mês estiver selecionado) */}
          {period !== 'all' && (
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                {(data?.availableYears && data.availableYears.length > 0
                  ? data.availableYears
                  : [new Date().getFullYear()]
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchReports(period, selectedYear)}
            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800 shadow-sm hover:bg-gray-50 transition"
            title="Recarregar Dados"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
            title="Imprimir ou Salvar Relatório como PDF"
          >
            <Printer className="h-4 w-4 text-gray-600" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-24 min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Carregando relatórios...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-6 text-center max-w-md mx-auto my-12">
          <p className="font-semibold text-sm">{error}</p>
          <button
            onClick={() => fetchReports(period, selectedYear)}
            className="mt-3 text-xs bg-red-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      ) : !data || data.summary.totalLists === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-md mx-auto my-12">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">Nenhum dado encontrado em {getPeriodLabel()}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Crie listas de compras ou selecione outro mês/ano para visualizar as análises.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards Grid: 5 Cards (Total Gasto, Gasto Médio, Itens Adicionados, Itens Comprados, Orçamento) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Gasto */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Gasto</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-black text-gray-900 leading-none">
                {formatCurrency(data.summary.totalSpent)}
              </p>
              <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                <span>{data.summary.totalLists} listas ({data.summary.completedLists} concluídas)</span>
              </div>
            </div>

            {/* Card 2: Média por Compra */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gasto Médio</span>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-black text-gray-900 leading-none">
                {formatCurrency(data.summary.avgSpentPerList)}
              </p>
              <p className="mt-2 text-[11px] text-gray-500 font-medium">
                Por lista de compras
              </p>
            </div>

            {/* Card 3: Itens no Carrinho (Comprados ou Não) */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Itens no Carrinho</span>
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-black text-purple-700 leading-none">
                {formatQuantity(data.summary.totalItemsInLists)}
              </p>
              <p className="mt-2 text-[11px] text-gray-500 font-medium truncate" title={`${data.summary.totalProductsInLists} produtos adicionados (comprados ou não)`}>
                {data.summary.totalProductsInLists} produtos (comprados ou não)
              </p>
            </div>

            {/* Card 4: Itens Comprados Apenas */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Itens Comprados</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-black text-emerald-700 leading-none">
                {formatQuantity(data.summary.totalItemsBought)}
              </p>
              <p className="mt-2 text-[11px] text-gray-500 font-medium truncate" title={`${data.summary.totalProductsBought} produtos finalizados`}>
                {data.summary.totalProductsBought} produtos finalizados
              </p>
            </div>

            {/* Card 5: Meta / Orçamento */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Orçamento x Gasto</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              {data.summary.totalBudget > 0 ? (
                <>
                  <p className="text-xl font-black text-gray-900 leading-none">
                    {formatCurrency(data.summary.totalBudget)}
                  </p>
                  <div className="mt-2 text-[11px] font-bold flex items-center gap-1">
                    {data.summary.budgetSavings >= 0 ? (
                      <span className="text-emerald-700 flex items-center">
                        <ArrowDownRight className="h-3 w-3" />
                        Economia {formatCurrency(data.summary.budgetSavings)}
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <ArrowUpRight className="h-3 w-3" />
                        Estouro {formatCurrency(Math.abs(data.summary.budgetSavings))}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-gray-700 leading-none">Sem meta</p>
                  <p className="mt-2 text-[11px] text-gray-400">Defina orçamentos nas listas</p>
                </>
              )}
            </div>
          </div>

          {/* Duas Colunas: Categorias & Evolução Mensal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gastos por Categoria */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Gastos por Categoria</h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {data.byCategory.length} categorias
                </span>
              </div>

              {data.byCategory.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Nenhum gasto categorizado em {getPeriodLabel()}.</p>
              ) : (
                <div className="space-y-3.5">
                  {data.byCategory.map((cat) => (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          ></span>
                          <span className="font-bold text-gray-800">{cat.name}</span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            ({cat.itemsCount} {cat.itemsCount === 1 ? 'item' : 'itens'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900">{formatCurrency(cat.totalSpent)}</span>
                          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evolução Mensal de Gastos */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Evolução de Gastos no Tempo</h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {data.byMonth.length} {data.byMonth.length === 1 ? 'mês' : 'meses'}
                </span>
              </div>

              {data.byMonth.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Nenhum histórico registrado no período.</p>
              ) : (
                <div className="pt-2">
                  {/* Gráfico de Barras Responsivo */}
                  <div className="flex items-end gap-2.5 h-44 border-b border-gray-200 pb-2 px-1">
                    {data.byMonth.map((m) => {
                      const heightPercent = Math.max(8, Math.round((m.totalSpent / maxMonthSpent) * 100));
                      return (
                        <div
                          key={m.monthKey}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                            {formatCurrency(m.totalSpent)} ({m.itemsCount} itens)
                          </div>

                          <div
                            className="w-full max-w-[42px] bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all duration-300"
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                          <span className="text-[10px] font-bold text-gray-500 mt-2 truncate max-w-[48px]">
                            {m.monthLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumo abaixo do gráfico */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-3 px-1">
                    <span>
                      Total no período: <strong className="text-gray-900">{formatCurrency(data.summary.totalSpent)}</strong>
                    </span>
                    <span>
                      Média mensal: <strong className="text-gray-900">
                        {formatCurrency(
                          data.byMonth.length > 0 ? data.summary.totalSpent / data.byMonth.length : 0
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Produtos: Ranking de Maiores Gastos e Mais Comprados */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Ranking de Produtos Mais Comprados</h3>
              </div>

              {/* Abas do Ranking */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start">
                <button
                  type="button"
                  onClick={() => setProductTab('spent')}
                  className={`px-3 py-1 rounded-lg transition ${
                    productTab === 'spent' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Maior Valor Total (R$)
                </button>
                <button
                  type="button"
                  onClick={() => setProductTab('quantity')}
                  className={`px-3 py-1 rounded-lg transition ${
                    productTab === 'quantity' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Maior Quantidade (Qtd)
                </button>
              </div>
            </div>

            {productTab === 'spent' ? (
              data.topProductsBySpent.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhum produto registrado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-2 pl-2">#</th>
                        <th className="pb-2">Produto</th>
                        <th className="pb-2">Categoria</th>
                        <th className="pb-2 text-center">Qtd Comprada</th>
                        <th className="pb-2 text-right pr-2">Total Gasto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topProductsBySpent.map((prod, idx) => (
                        <tr key={prod.name} className="hover:bg-gray-50/70 transition">
                          <td className="py-2.5 pl-2 font-bold text-gray-400 text-[11px]">{idx + 1}º</td>
                          <td className="py-2.5 font-bold text-gray-800">{prod.name}</td>
                          <td className="py-2.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: `${prod.categoryColor}20`,
                                color: prod.categoryColor,
                              }}
                            >
                              {prod.categoryName}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-medium text-gray-600">
                            {formatQuantity(prod.totalQuantity)} {prod.unit}
                          </td>
                          <td className="py-2.5 text-right pr-2 font-extrabold text-emerald-700">
                            {formatCurrency(prod.totalSpent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              data.topProductsByQuantity.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhum produto registrado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-2 pl-2">#</th>
                        <th className="pb-2">Produto</th>
                        <th className="pb-2">Categoria</th>
                        <th className="pb-2 text-center">Volume Total</th>
                        <th className="pb-2 text-right pr-2">Total Gasto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topProductsByQuantity.map((prod, idx) => (
                        <tr key={prod.name} className="hover:bg-gray-50/70 transition">
                          <td className="py-2.5 pl-2 font-bold text-gray-400 text-[11px]">{idx + 1}º</td>
                          <td className="py-2.5 font-bold text-gray-800">{prod.name}</td>
                          <td className="py-2.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: `${prod.categoryColor}20`,
                                color: prod.categoryColor,
                              }}
                            >
                              {prod.categoryName}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-extrabold text-gray-900">
                            {formatQuantity(prod.totalQuantity)} {prod.unit}
                          </td>
                          <td className="py-2.5 text-right pr-2 font-bold text-gray-700">
                            {formatCurrency(prod.totalSpent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Histórico e Desempenho de Orçamento por Lista */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Histórico de Listas & Cumprimento de Orçamento</h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {data.listPerformance.length} listas analisadas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2 pl-2">Lista</th>
                    <th className="pb-2">Data</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-center">Itens Comprados</th>
                    <th className="pb-2 text-right">Meta (Orçamento)</th>
                    <th className="pb-2 text-right">Gasto Real</th>
                    <th className="pb-2 text-right pr-2">Desempenho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.listPerformance.map((lst) => {
                    const formattedDate = new Date(lst.createdAt).toLocaleDateString('pt-BR');
                    return (
                      <tr key={lst.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3 pl-2 font-bold text-gray-800">{lst.title}</td>
                        <td className="py-3 text-gray-500">{formattedDate}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lst.status === 'COMPLETED'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {lst.status === 'COMPLETED' ? 'Finalizada' : 'Ativa'}
                          </span>
                        </td>
                        <td className="py-3 text-center text-gray-600">
                          {lst.boughtItems} de {lst.totalItems}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-600">
                          {lst.budget ? formatCurrency(lst.budget) : '-'}
                        </td>
                        <td className="py-3 text-right font-bold text-gray-900">
                          {formatCurrency(lst.totalSpent)}
                        </td>
                        <td className="py-3 text-right pr-2">
                          {lst.budget ? (
                            lst.isOverBudget ? (
                              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                Estourou {formatCurrency(Math.abs(lst.difference || 0))}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                Sobrou {formatCurrency(lst.difference || 0)}
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 text-[11px]">Sem meta</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
