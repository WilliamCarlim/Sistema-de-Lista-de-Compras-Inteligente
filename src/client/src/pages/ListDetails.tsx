import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Plus, Trash2, Edit3, AlertTriangle, ShoppingCart, Info, Package, X, Printer, DollarSign } from 'lucide-react';
import { api, ListItem, Category, Product, ShoppingList } from '../services/api.ts';

interface ListDetailsProps {
  listId: string;
  onBack: () => void;
}

export function ListDetails({ listId, onBack }: ListDetailsProps) {
  const [list, setList] = useState<(ShoppingList & { items: ListItem[] }) | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Item State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Edit Item State
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnit, setEditUnit] = useState('un');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editUpdateProductPrice, setEditUpdateProductPrice] = useState(true);

  // Quick Paid Price Modal State (Modo Compras / Preço Pago no Supermercado)
  const [paidPriceItem, setPaidPriceItem] = useState<ListItem | null>(null);
  const [paidUnitPrice, setPaidUnitPrice] = useState('');
  const [paidTotalPrice, setPaidTotalPrice] = useState('');
  const [paidUpdateProduct, setPaidUpdateProduct] = useState(true);
  const [paidMarkBought, setPaidMarkBought] = useState(true);
  const [savingPaidPrice, setSavingPaidPrice] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listData, catData, prodData] = await Promise.all([
        api.getListDetails(listId),
        api.getCategories(),
        api.getProducts(),
      ]);
      setList(listData);
      setCategories(catData);
      setProducts(prodData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes da lista.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [listId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // When user selects a registered product from dropdown or autocomplete, auto-fill fields
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;

    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setName(prod.name);
      setUnit(prod.defaultUnit || 'un');
      setPrice(prod.defaultPrice ? prod.defaultPrice.toString() : '');
      setCategoryId(prod.categoryId || '');
    }
  };

  // Filter products for autocomplete matching
  const matchingProducts = name.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(name.toLowerCase().trim()))
    : [];

  // Toggle item bought (Optimistic)
  const handleToggleBought = async (item: ListItem) => {
    if (!list) return;

    const previousItems = [...list.items];
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
      setList({ ...list, items: previousItems });
      alert('Erro ao atualizar status do item.');
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
        productId: selectedProductId || null,
        notes: notes || null,
      });

      if (list) {
        setList({
          ...list,
          items: [newItem, ...list.items],
        });
      }

      if (newItem.product && !products.some((p) => p.id === newItem.product?.id)) {
        setProducts((prev) => [...prev, newItem.product!].sort((a, b) => a.name.localeCompare(b.name)));
      }

      // Reset
      setSelectedProductId('');
      setName('');
      setQuantity('1');
      setUnit('un');
      setPrice('');
      setCategoryId('');
      setNotes('');
      setShowSuggestions(false);
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar item.');
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja remover este item da lista?')) return;

    try {
      await api.deleteItem(itemId);
      if (list) {
        setList({
          ...list,
          items: list.items.filter((i) => i.id !== itemId),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao remover item.');
    }
  };

  // Quick Paid Price Modal Handlers (Modo Compras)
  const openPaidPriceModal = (item: ListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaidPriceItem(item);
    const unitPriceVal = item.price !== null && item.price !== undefined ? item.price.toString() : '';
    setPaidUnitPrice(unitPriceVal);
    setPaidTotalPrice(
      item.price ? (item.quantity * item.price).toFixed(2) : ''
    );
    setPaidUpdateProduct(true);
    setPaidMarkBought(true);
  };

  const handleUnitPriceChange = (val: string) => {
    setPaidUnitPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && paidPriceItem) {
      setPaidTotalPrice((num * paidPriceItem.quantity).toFixed(2));
    } else {
      setPaidTotalPrice('');
    }
  };

  const handleTotalPriceChange = (val: string) => {
    setPaidTotalPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && paidPriceItem && paidPriceItem.quantity > 0) {
      setPaidUnitPrice((num / paidPriceItem.quantity).toFixed(2));
    } else {
      setPaidUnitPrice('');
    }
  };

  const handleSavePaidPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidPriceItem || !list) return;

    try {
      setSavingPaidPrice(true);
      const parsedPrice = paidUnitPrice ? parseFloat(paidUnitPrice) : null;

      const updated = await api.updateItem(paidPriceItem.id, {
        price: parsedPrice,
        bought: paidMarkBought,
        updateProductPrice: paidUpdateProduct,
      });

      setList({
        ...list,
        items: list.items.map((i) => (i.id === paidPriceItem.id ? updated : i)),
      });

      if (paidUpdateProduct && parsedPrice !== null) {
        setProducts((prev) =>
          prev.map((p) => {
            if (
              (paidPriceItem.productId && p.id === paidPriceItem.productId) ||
              p.name.toLowerCase().trim() === paidPriceItem.name.toLowerCase().trim()
            ) {
              return { ...p, defaultPrice: parsedPrice };
            }
            return p;
          })
        );
      }

      setPaidPriceItem(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar o preço pago.');
    } finally {
      setSavingPaidPrice(false);
    }
  };

  // Edit Item Modal
  const startEdit = (item: ListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity.toString());
    setEditUnit(item.unit);
    setEditPrice(item.price ? item.price.toString() : '');
    setEditCategoryId(item.categoryId || '');
    setEditNotes(item.notes || '');
    setEditUpdateProductPrice(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !list) return;

    try {
      const parsedPrice = editPrice ? parseFloat(editPrice) : null;
      const updated = await api.updateItem(editingItem.id, {
        name: editName,
        quantity: parseFloat(editQuantity) || 1,
        unit: editUnit,
        price: parsedPrice,
        categoryId: editCategoryId || null,
        notes: editNotes || null,
        updateProductPrice: editUpdateProductPrice,
      });

      setList({
        ...list,
        items: list.items.map((i) => (i.id === editingItem.id ? updated : i)),
      });

      if (editUpdateProductPrice && parsedPrice !== null) {
        setProducts((prev) =>
          prev.map((p) => {
            if (
              (editingItem.productId && p.id === editingItem.productId) ||
              p.name.toLowerCase().trim() === editName.toLowerCase().trim()
            ) {
              return { ...p, defaultPrice: parsedPrice };
            }
            return p;
          })
        );
      }

      setEditingItem(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações do item.');
    }
  };

  const handleToggleListStatus = async () => {
    if (!list) return;
    const newStatus = list.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';

    try {
      const updated = await api.updateList(list.id, { status: newStatus });
      if (newStatus === 'COMPLETED') {
        // Ao finalizar, volta para a tela inicial
        onBack();
      } else {
        setList({ ...list, status: updated.status });
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status da lista.');
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalEstimated = list?.items.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0) || 0;
  const totalBought = list?.items.filter((i) => i.bought).reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0) || 0;
  const budget = list?.budget || 0;
  const isOverBudget = budget > 0 && totalBought > budget;
  const progressPercentage = list && list.items.length > 0
    ? Math.round((list.items.filter((i) => i.bought).length / list.items.length) * 100)
    : 0;

  const totalProducts = list?.items.length || 0;
  const totalUnits = list?.items.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
  const boughtProducts = list?.items.filter((i) => i.bought).length || 0;
  const boughtUnits = list?.items.filter((i) => i.bought).reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

  const formatQuantity = (qty: number) => {
    return Number.isInteger(qty) ? qty.toString() : qty.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };

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
      <div className="flex flex-col items-center justify-center py-24 min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Carregando itens da lista...</p>
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
          Voltar para as listas
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-36 print:p-0 print:pb-0">
      {/* Printable Header (Apenas na Impressão/PDF) */}
      <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{list.title}</h1>
            {list.description && <p className="text-xs text-gray-600 mt-1">{list.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>Status: <strong>{list.status === 'COMPLETED' ? 'Finalizada' : 'Ativa'}</strong></span>
              <span>•</span>
              <span>Total: <strong>{totalProducts} {totalProducts === 1 ? 'produto' : 'produtos'}</strong> ({formatQuantity(totalUnits)} {totalUnits === 1 ? 'item' : 'itens'} • {boughtProducts} comprados)</span>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="text-gray-500">Impresso em: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
            {budget > 0 && <p className="text-gray-700 mt-0.5">Meta Orçamento: <strong>{formatCurrency(budget)}</strong></p>}
            <p className="text-sm font-bold text-gray-900 mt-1">Total Estimado: {formatCurrency(totalEstimated)}</p>
            <p className="text-xs font-semibold text-emerald-800">Total Comprado: {formatCurrency(totalBought)}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-1">{list.title}</h2>
            <p className="text-xs text-gray-500 font-medium">
              {totalProducts} {totalProducts === 1 ? 'produto' : 'produtos'} • {formatQuantity(totalUnits)} {totalUnits === 1 ? 'item' : 'itens'} {budget > 0 ? `| Meta: ${formatCurrency(budget)}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
            title="Imprimir ou Salvar como PDF"
          >
            <Printer className="h-4 w-4 text-gray-600" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>

          <button
            onClick={handleToggleListStatus}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition shadow-sm ${
              list.status === 'COMPLETED'
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {list.status === 'COMPLETED' ? 'Reabrir Lista' : 'Concluir'}
          </button>
        </div>
      </div>

      {/* Button to show Add Item form */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-2xl shadow-sm text-sm transition mb-6 print:hidden"
        >
          <Plus className="h-4 w-4" />
          Adicionar Item à Lista
        </button>
      )}

      {/* Add Item Form Card */}
      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 mb-6 animate-in slide-in-from-top duration-150 print:hidden"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="font-bold text-gray-800 text-sm">Adicionar Item</h3>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setShowSuggestions(false);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
            >
              Fechar
            </button>
          </div>

          {/* Quick Select from Products Catalog */}
          {products.length > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
              <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-emerald-600" />
                Preencher rápido com Produto Cadastrado:
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  handleSelectProduct(e.target.value);
                  setShowSuggestions(false);
                }}
                className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Selecione ou digite manualmente abaixo --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultUnit}) {p.defaultPrice ? `- R$ ${p.defaultPrice.toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            {/* Input Nome do Item com Autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Nome do Item *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Arroz, Leite, Detergente..."
                value={name}
                onFocus={() => {
                  if (name.trim().length > 0) setShowSuggestions(true);
                }}
                onChange={(e) => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                  if (selectedProductId) {
                    const matchingProd = products.find((p) => p.id === selectedProductId);
                    if (!matchingProd || matchingProd.name.toLowerCase() !== e.target.value.toLowerCase()) {
                      setSelectedProductId('');
                    }
                  }
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions && matchingProducts.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-emerald-300 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-gray-100">
                  <div className="px-3 py-1.5 bg-emerald-50/80 text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between sticky top-0 backdrop-blur-sm">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-emerald-600" />
                      Produtos Cadastrados Sugeridos ({matchingProducts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {matchingProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleSelectProduct(p.id);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/60 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700">
                          {p.name}
                        </span>
                        {p.category && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${p.category.color || '#10b981'}20`,
                              color: p.category.color || '#059669',
                            }}
                          >
                            {p.category.name}
                          </span>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500 shrink-0">
                        <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                          {p.defaultUnit}
                        </span>
                        {p.defaultPrice ? (
                          <span className="ml-1.5 font-bold text-gray-800">
                            {formatCurrency(p.defaultPrice)}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qtd</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unidade</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                >
                  <option value="un">un</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="pacote">pct</option>
                  <option value="caixa">cx</option>
                  <option value="lata">lt</option>
                  <option value="dz">dz</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço Unit. (R$ - Opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00 (Opcional)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações / Marca</label>
              <input
                type="text"
                placeholder="Ex: Marca específica, preferência..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
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

      {/* Items by Category */}
      {list.items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center mt-4">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h4 className="font-bold text-gray-800">Sua lista está vazia</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Adicione itens digitando ou selecionando de seus produtos cadastrados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedItems).map((catName) => {
            const { category, items } = groupedItems[catName];
            const tagColor = category?.color || '#9CA3AF';

            return (
              <div key={catName} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full print:border print:border-gray-500"
                    style={{ backgroundColor: tagColor }}
                  ></span>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {catName}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-medium">({items.length})</span>
                </div>

                <div className="space-y-1.5">
                  {items.map((item) => {
                    const itemTotal = item.quantity * (item.price || 0);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleBought(item)}
                        className={`flex items-center justify-between p-3.5 bg-white border rounded-2xl shadow-sm transition active:scale-[0.99] select-none cursor-pointer print:shadow-none print:rounded-lg print:p-2.5 print:my-1 ${
                          item.bought
                            ? 'border-gray-200 bg-gray-50/60 opacity-75 print:opacity-100'
                            : 'border-gray-200 hover:border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`h-5 w-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                              item.bought
                                ? 'bg-emerald-500 border-emerald-500 text-white print:border-black print:bg-gray-200 print:text-black'
                                : 'border-gray-300 text-transparent print:border-black'
                            }`}
                          >
                            <span className="text-[10px] font-bold">
                              {item.bought ? '✓' : ''}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`text-sm font-bold text-gray-900 truncate leading-snug ${
                                item.bought ? 'line-through text-gray-400 print:text-gray-700' : ''
                              }`}
                            >
                              {item.name}
                            </p>
                            {item.notes && (
                              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <Info className="h-3 w-3 shrink-0 text-gray-400 print:hidden" />
                                <span className="truncate">{item.notes}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {/* Botão de Preço Pago / Exibição de Valores */}
                          <div className="text-right print:block">
                            <span className="text-xs font-semibold text-gray-500 block leading-tight">
                              {item.quantity} {item.unit}
                            </span>
                            {item.price ? (
                              <button
                                type="button"
                                onClick={(e) => openPaidPriceModal(item, e)}
                                className="mt-0.5 text-right group flex flex-col items-end print:pointer-events-none"
                                title="Clique para alterar o preço pago"
                              >
                                <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-700 transition">
                                  {formatCurrency(itemTotal)}
                                </span>
                                <span className="text-[10px] text-gray-400 group-hover:text-emerald-600 font-medium">
                                  {formatCurrency(item.price)}/{item.unit}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => openPaidPriceModal(item, e)}
                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition print:hidden"
                                title="Informar o preço pago durante a compra"
                              >
                                <DollarSign className="h-3 w-3 text-emerald-600" />
                                <span>Preço</span>
                              </button>
                            )}
                          </div>

                          {/* Ações de Edição / Preço Pago / Excluir */}
                          <div className="flex items-center gap-0.5 print:hidden" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => openPaidPriceModal(item, e)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Informar Preço Pago"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => startEdit(item, e)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Editar Item Completo"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteItem(item.id, e)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Excluir Item"
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

      {/* Printable Footer / Totais no fim da página impressa */}
      <div className="hidden print:block mt-8 pt-4 border-t-2 border-gray-400 text-xs">
        <div className="flex justify-between items-center">
          <p className="text-gray-500">Lista gerada pelo Sistema Lista Inteligente</p>
          <div className="text-right space-y-1">
            <p>Total: <strong>{totalProducts} produtos ({formatQuantity(totalUnits)} itens)</strong> ({boughtProducts} produtos comprados)</p>
            <p className="text-sm font-bold text-gray-900">Total Estimado: {formatCurrency(totalEstimated)}</p>
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-800 text-base">Editar Item</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qtd</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unidade</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                  >
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pacote">pct</option>
                    <option value="caixa">cx</option>
                    <option value="lata">lt</option>
                    <option value="dz">dz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço Unit. (R$ - Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00 (Opcional)"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Categoria</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
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
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {editPrice && (
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={editUpdateProductPrice}
                    onChange={(e) => setEditUpdateProductPrice(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-gray-300"
                  />
                  <div>
                    <strong className="block text-gray-900 font-semibold leading-tight">
                      Atualizar valor no cadastro do produto
                    </strong>
                    <span className="text-[10px] text-gray-500">
                      O preço padrão deste produto será salvo para as próximas listas.
                    </span>
                  </div>
                </label>
              )}

              <div className="flex gap-2 justify-end text-sm pt-2 border-t border-gray-100">
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

      {/* Quick Paid Price Modal (Informar Preço Pago durante as Compras) */}
      {paidPriceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-emerald-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">Preço Pago na Compra</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{paidPriceItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaidPriceItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaidPrice} className="space-y-4">
              {/* Badge de quantidade e unidade */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Quantidade na lista:</span>
                <span className="font-bold text-gray-800 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  {paidPriceItem.quantity} {paidPriceItem.unit}
                </span>
              </div>

              {/* Campos de Preço Unitário e Total Pago */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Preço Unitário (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      required
                      placeholder="0,00"
                      value={paidUnitPrice}
                      onChange={(e) => handleUnitPriceChange(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 pl-8 pr-2 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Total Pago (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={paidTotalPrice}
                      onChange={(e) => handleTotalPriceChange(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 pl-8 pr-2 py-2 text-sm font-bold text-emerald-700 bg-emerald-50/30 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes de Integração */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer select-none bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={paidUpdateProduct}
                    onChange={(e) => setPaidUpdateProduct(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-gray-300"
                  />
                  <div>
                    <strong className="block text-gray-900 font-semibold leading-tight">
                      Atualizar no cadastro do produto
                    </strong>
                    <span className="text-[11px] text-gray-500">
                      O valor inserido será salvo como preço padrão do produto.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none px-1">
                  <input
                    type="checkbox"
                    checked={paidMarkBought}
                    onChange={(e) => setPaidMarkBought(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-gray-300"
                  />
                  <span className="font-medium text-gray-800">
                    Marcar item como comprado no carrinho
                  </span>
                </label>
              </div>

              {/* Ações */}
              <div className="flex gap-2 justify-end text-sm pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPaidPriceItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPaidPrice}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingPaidPrice ? 'Salvando...' : 'Confirmar Preço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Mobile/Desktop Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-xl px-4 py-3.5 print:hidden">
        <div className="mx-auto max-w-4xl">
          <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 mb-1 px-1">
            <span>Progresso ({boughtProducts} de {totalProducts} produtos • {formatQuantity(boughtUnits)} itens)</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>

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
