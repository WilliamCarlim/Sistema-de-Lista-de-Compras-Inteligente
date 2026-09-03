import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, ShoppingBag, Percent, ArrowRight, X } from 'lucide-react';
import { api, ShoppingList, User } from '../services/api.ts';

interface DashboardProps {
  user?: User;
  onSelectList: (id: string) => void;
}

export function Dashboard({ onSelectList }: DashboardProps) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const [listFilter, setListFilter] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');

  const fetchLists = async () => {
    try {
      setLoading(true);
      const data = await api.getLists();
      setLists(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar listas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const openCreateModal = () => {
    setEditingList(null);
    setTitle('');
    setDescription('');
    setBudget('');
    setIsModalOpen(true);
  };

  const openEditModal = (list: ShoppingList, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingList(list);
    setTitle(list.title);
    setDescription(list.description || '');
    setBudget(list.budget ? list.budget.toString() : '');
    setIsModalOpen(true);
  };

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      const parsedBudget = budget ? parseFloat(budget) : null;

      if (editingList) {
        await api.updateList(editingList.id, {
          title,
          description: description || null,
          budget: parsedBudget,
        });
      } else {
        await api.createList(title, description || null, parsedBudget);
        setListFilter('ACTIVE');
      }

      setIsModalOpen(false);
      fetchLists();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar lista.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Deseja realmente excluir a lista "${title}"? Todos os itens associados serão removidos.`)) {
      return;
    }

    try {
      await api.deleteList(id);
      fetchLists();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir lista.');
    }
  };

  const handleToggleListStatusFromCard = async (list: ShoppingList, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = list.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    try {
      await api.updateList(list.id, { status: newStatus });
      fetchLists();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status da lista.');
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const activeLists = lists.filter((l) => l.status !== 'COMPLETED');
  const completedLists = lists.filter((l) => l.status === 'COMPLETED');
  const displayedLists = listFilter === 'ACTIVE' ? activeLists : completedLists;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-emerald-600" />
            Minhas Listas de Compras
          </h2>
          <p className="text-sm text-gray-500">
            Organize suas compras, acompanhe o orçamento e marque itens comprados.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          Nova Lista
        </button>
      </div>

      {/* Tabs Filter: Ativas vs Finalizadas */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setListFilter('ACTIVE')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition ${
            listFilter === 'ACTIVE'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ativas
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold transition ${
              listFilter === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {activeLists.length}
          </span>
        </button>

        <button
          onClick={() => setListFilter('COMPLETED')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition ${
            listFilter === 'COMPLETED'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Finalizadas
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold transition ${
              listFilter === 'COMPLETED'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {completedLists.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-3 text-sm text-gray-500 font-medium">Carregando suas listas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      ) : displayedLists.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h4 className="font-bold text-gray-800">
            {listFilter === 'ACTIVE' ? 'Nenhuma lista ativa no momento' : 'Nenhuma lista finalizada'}
          </h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {listFilter === 'ACTIVE'
              ? 'Você não tem listas ativas. Crie uma nova lista para começar suas compras!'
              : 'Quando você concluir suas compras em uma lista, ela aparecerá aqui no histórico de finalizadas.'}
          </p>
          {listFilter === 'ACTIVE' && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              <Plus className="h-4 w-4" />
              Criar primeira lista
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayedLists.map((list) => {
            const total = list.totalItems || 0;
            const bought = list.boughtItems || 0;
            const progressPercentage = total > 0 ? Math.round((bought / total) * 100) : 0;
            const isOverBudget = list.budget ? (list.totalSpent || 0) > list.budget : false;

            return (
              <div
                key={list.id}
                onClick={() => onSelectList(list.id)}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">
                      {list.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleToggleListStatusFromCard(list, e)}
                      title={list.status === 'COMPLETED' ? 'Clique para reabrir como Ativa' : 'Clique para marcar como Finalizada'}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border transition ${
                        list.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {list.status === 'COMPLETED' ? 'Concluída' : 'Ativa'}
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {list.description || 'Sem descrição.'}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-600">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3.5 w-3.5 text-gray-400" />
                        Progresso
                      </span>
                      <span>
                        {bought}/{total} itens ({progressPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          list.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Financials & Actions */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs">
                    {list.budget && (
                      <div className="text-gray-500 font-medium">
                        Meta: <span className="font-semibold text-gray-700">{formatCurrency(list.budget)}</span>
                      </div>
                    )}
                    <div className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
                      Gasto: <span className="font-bold text-gray-900">{formatCurrency(list.totalSpent)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEditModal(list, e)}
                      className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-50 transition"
                      title="Editar Lista"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteList(list.id, list.title, e)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      title="Excluir Lista"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="p-2 text-emerald-600 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition ml-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Lista */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">
                {editingList ? 'Editar Lista' : 'Nova Lista de Compras'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveList} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Título da Lista *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rancho do Mês, Churrasco, Feira"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Orçamento Limite (R$ - Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 350.00"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Descrição / Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Supermercado Atacadão, compras de fim de ano..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition disabled:bg-emerald-400"
                >
                  {saving ? 'Salvando...' : 'Salvar Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
