import React, { useEffect, useState } from 'react';
import { Plus, Trash2, LogOut, DollarSign, ArrowRight, ShoppingBag, Percent, Calendar } from 'lucide-react';
import { api, ShoppingList, User } from '../services/api.ts';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onSelectList: (id: string) => void;
}

export function Dashboard({ user, onLogout, onSelectList }: DashboardProps) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for new list
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');

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

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const parsedBudget = budget ? parseFloat(budget) : null;
      await api.createList(title, description, parsedBudget);
      setTitle('');
      setDescription('');
      setBudget('');
      setIsCreating(false);
      fetchLists();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar lista.');
    }
  };

  const handleDeleteList = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta lista? Todos os itens associados serão removidos.')) {
      return;
    }

    try {
      await api.deleteList(id);
      fetchLists();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar lista.');
    }
  };

  // Helper formatting BRL currency
  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-2 rounded-lg">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Lista de Compras</h1>
              <p className="text-xs text-emerald-600 font-medium">Inteligente & Mobile</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-gray-600 font-medium">
              Olá, <span className="text-gray-900 font-semibold">{user.name}</span>
            </span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 font-semibold transition"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 mt-6">
        {/* Welcome Banner */}
        <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden mb-6">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold">Gerencie suas compras!</h2>
            <p className="mt-2 text-emerald-100 max-w-md">
              Crie listas de mercado, defina orçamentos, agrupe itens por categoria e marque o que já comprou usando o Modo Mercado em tempo real.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <ShoppingBag className="w-48 h-48" />
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Minhas Listas</h3>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nova Lista
            </button>
          )}
        </div>

        {/* New List Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateList}
            className="bg-white border border-emerald-100 rounded-2xl p-5 mb-6 shadow-sm space-y-4 animate-in fade-in duration-200"
          >
            <h4 className="font-bold text-gray-800 text-base">Nova Lista de Compras</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rancho do Mês, Churrasco Fim de Semana"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Orçamento Limite (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 350.00 (Opcional)"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição / Notas</label>
              <textarea
                placeholder="Detalhes adicionais (Ex: Mercado Atacadão, etc.)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
              >
                Criar Lista
              </button>
            </div>
          </form>
        )}

        {/* Loading / Error States */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-500 font-medium">Carregando listas...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 text-sm text-center">
            {error}
          </div>
        )}

        {/* List Content */}
        {!loading && !error && lists.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h4 className="text-gray-900 font-bold text-base">Nenhuma lista encontrada</h4>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Você ainda não tem listas de compras. Clique em &quot;Nova Lista&quot; acima para criar a sua primeira lista!
            </p>
          </div>
        )}

        {!loading && !error && lists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lists.map((list) => {
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
                    {/* Title and Badges */}
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">
                        {list.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        list.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {list.status === 'COMPLETED' ? 'Concluída' : 'Ativa'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {list.description || 'Sem descrição.'}
                    </p>

                    {/* Progress Stats */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-gray-600">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5 text-gray-400" />
                          Progresso
                        </span>
                        <span>{bought}/{total} itens ({progressPercentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Financials & Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs">
                      {list.budget && (
                        <div className="text-gray-500 font-medium">
                          Meta: <span className="font-semibold text-gray-700">{formatCurrency(list.budget)}</span>
                        </div>
                      )}
                      <div className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
                        Comprado: <span className="font-bold text-gray-900">{formatCurrency(list.totalSpent)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                        title="Deletar Lista"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="p-2 text-emerald-600 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
