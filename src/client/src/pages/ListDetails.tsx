import React, { useEffect, useState } from 'react';
import { ChevronLeft, Plus, Trash2, Edit3, AlertTriangle, CheckCircle, ShoppingCart, Tag, Info } from 'lucide-react';
import { api, ListItem, Category, ShoppingList } from '../services/api.ts';

interface ListDetailsProps {
  listId: string;
  onBack: () => void;
}

export function ListDetails({ listId, onBack }: ListDetailsProps) {
  const [list, setList] = useState<(ShoppingList & { items: ListItem[] }) | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Item Form State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Editing Item State
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnit, setEditUnit] = useState('un');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Load list details and categories
  const loadData = async () => {
    try {
      setLoading(true);
      const [listData, catData] = await Promise.all([
        api.getListDetails(listId),
        api.getCategories(),
      ]);
      setList(listData);
      setCategories(catData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes da lista.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [listId]);

  // Handle toggle (bought / not bought) optimistic update
  const handleToggleBought = async (item: ListItem) => {
    if (!list) return;

    // Save previous state for rollback
    const previousItems = [...list.items];

    // Optimistic Update
    const updatedItems = list.items.map((i) => {
      if (i.id === item.id) {
        return { ...i, bought: !i.bought };
      }
      return i;
    });

    setList({ ...list, items: updatedItems });

    try {
      await api.toggleItem(item.id);
    } catch (err) {
      // Rollback on error
      setList({ ...list, items: previousItems });
      alert('Não foi possível atualizar o item no servidor. Tente novamente.');
    }
  };

  // Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newItem = await api.addItem(listId, {
        name,
        quantity: parseFloat(quantity) || 1,
        unit,
        price: price ? parseFloat(price) : null,
        categoryId: categoryId || null,
        notes: notes || null,
      });

      if (list) {
        setList({
          ...list,
          items: [newItem, ...list.items],
        });
      }

      // Reset form
      setName('');
      setQuantity('1');
      setUnit('un');
      setPrice('');
      setCategoryId('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar item.');
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este item?')) return;

    try {
      await api.deleteItem(itemId);
      if (list) {
        setList({
          ...list,
          items: list.items.filter((item) => item.id !== itemId),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao remover item.');
    }
  };

  // Open Edit Modal/State
  const startEdit = (item: ListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity.toString());
    setEditUnit(item.unit);
    setEditPrice(item.price?.toString() || '');
    setEditCategoryId(item.categoryId || '');
    setEditNotes(item.notes || '');
  };

  // Save Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !list) return;

    try {
      const updated = await api.updateItem(editingItem.id, {
        name: editName,
        quantity: parseFloat(editQuantity) || 1,
        unit: editUnit,
        price: editPrice ? parseFloat(editPrice) : null,
        categoryId: editCategoryId || null,
        notes: editNotes || null,
      });

      setList({
        ...list,
        items: list.items.map((i) => (i.id === editingItem.id ? updated : i)),
      });

      setEditingItem(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações.');
    }
  };

  // Mark list status (ACTIVE, COMPLETED, ARCHIVED)
  const handleToggleListStatus = async () => {
    if (!list) return;
    const newStatus = list.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';

    try {
      const updated = await api.updateList(list.id, { status: newStatus });
      setList({ ...list, status: updated.status });
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status da lista.');
    }
  };

  // Format currency
  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calculations
  const totalEstimated = list?.items.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0) || 0;
  const totalBought = list?.items.filter((i) => i.bought).reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0) || 0;
  const budget = list?.budget || 0;
  const isOverBudget = budget > 0 && totalBought > budget;
  const progressPercentage = list && list.items.length > 0
    ? Math.round((list.items.filter((i) => i.bought).length / list.items.length) * 100)
    : 0;

  // Group items by category name
  const groupedItems: { [categoryName: string]: { category: Category | null; items: ListItem[] } } = {};

  if (list) {
    list.items.forEach((item) => {
      const catName = item.category?.name || 'Sem Categoria';
      if (!groupedItems[catName]) {
        groupedItems[catName] = {
          category: item.category || null,
          items: [],
        };
      }
      groupedItems[catName].items.push(item);
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Carregando itens...</p>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="max-w-md mx-auto mt-12 px-4 text-center">
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 text-sm">
          {error || 'Não foi possível carregar esta lista.'}
        </div>
        <button
          onClick={onBack}
          className="mt-4 text-emerald-600 font-semibold text-sm hover:underline"
        >
          Voltar para o painel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight line-clamp-1">{list.title}</h1>
              <p className="text-xs text-gray-500 font-medium">
                {list.items.length} itens {budget > 0 ? `| Limite ${formatCurrency(budget)}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleListStatus}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              list.status === 'COMPLETED'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {list.status === 'COMPLETED' ? 'Finalizada' : 'Concluir'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 mt-4">
        {/* Toggle Button for Add Item Form */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-2xl shadow-sm text-sm transition"
          >
            <Plus className="h-4 w-4" />
            Adicionar Item
          </button>
        )}

        {/* Add Item Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddItem}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3.5 mb-4 animate-in slide-in-from-top duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-800 text-sm">Adicionar Item</h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
              >
                Ocultar
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome do Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arroz, Leite Condensado"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qtd</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pacote">pct</option>
                    <option value="caixa">cx</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Sem Categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notas / Detalhes</label>
                <input
                  type="text"
                  placeholder="Ex: Marca específica, preferência de amadurecimento"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition"
            >
              Adicionar à Lista
            </button>
          </form>
        )}

        {/* List of items grouped by category */}
        {list.items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center mt-6">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h4 className="text-gray-900 font-bold text-base">Sua lista está vazia</h4>
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
              Adicione itens digitando o nome, quantidade e preço acima para planejar seu mercado.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {Object.keys(groupedItems).map((catName) => {
              const { category, items } = groupedItems[catName];
              const tagColor = category?.color || '#9CA3AF'; // fallback grey

              return (
                <div key={catName} className="space-y-2">
                  {/* Category Title */}
                  <div className="flex items-center gap-2 px-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tagColor }}
                    ></span>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {catName}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium">({items.length})</span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1">
                    {items.map((item) => {
                      const itemTotal = item.quantity * (item.price || 0);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleBought(item)}
                          className={`flex items-center justify-between p-3.5 bg-white border rounded-2xl shadow-sm transition active:scale-[0.98] select-none cursor-pointer ${
                            item.bought
                              ? 'border-gray-200 bg-gray-50/50 opacity-75'
                              : 'border-gray-200 hover:border-emerald-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Check Circle Tap Target */}
                            <div
                              className={`h-5.5 w-5.5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                                item.bought
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-gray-300 text-transparent'
                              }`}
                            >
                              <span className="text-[10px] font-bold">✓</span>
                            </div>

                            <div className="min-w-0">
                              <p
                                className={`text-sm font-bold text-gray-900 truncate leading-snug ${
                                  item.bought ? 'line-through text-gray-400' : ''
                                }`}
                              >
                                {item.name}
                              </p>
                              {item.notes && (
                                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Info className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{item.notes}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 ml-3 shrink-0">
                            {/* Price / Qtd Info */}
                            <div className="text-right">
                              <span className="text-xs font-semibold text-gray-500">
                                {item.quantity} {item.unit}
                              </span>
                              {item.price && (
                                <div className="text-xs font-bold text-gray-900 mt-0.5">
                                  {formatCurrency(itemTotal)}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => startEdit(item, e)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg transition"
                                title="Editar"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteItem(item.id, e)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-gray-800 text-base">Editar Item</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qtd</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unidade</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-2 py-2 text-sm focus:border-emerald-500"
                  >
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pacote">pct</option>
                    <option value="caixa">cx</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preço Unit.</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoria</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500"
                >
                  <option value="">Sem Categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notas / Detalhes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 justify-end text-sm pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Mobile Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-xl px-4 py-4 pb-safe-bottom">
        <div className="mx-auto max-w-md">
          {/* Progress Mini Bar */}
          <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 mb-1 px-1">
            <span>Progresso da Compra</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>

          {/* Totals Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total no Carrinho</p>
              <p className={`text-xl font-black ${isOverBudget ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatCurrency(totalBought)}
              </p>
            </div>

            <div className="text-right">
              {budget > 0 ? (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Orçamento Limite</p>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(budget)}</p>
                  {isOverBudget ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1 border border-red-100">
                      <AlertTriangle className="h-3 w-3" />
                      Estourou R$ {(totalBought - budget).toFixed(2)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-100">
                      Saldo R$ {(budget - totalBought).toFixed(2)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Estimado</p>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(totalEstimated)}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
