import React, { useEffect, useState } from 'react';
import { Plus, Package, Edit2, Trash2, Search, X, Tag } from 'lucide-react';
import { api, Product, Category } from '../services/api.ts';

const UNITS = [
  { label: 'Unidade (un)', value: 'un' },
  { label: 'Quilo (kg)', value: 'kg' },
  { label: 'Grama (g)', value: 'g' },
  { label: 'Litro (L)', value: 'L' },
  { label: 'Mililitro (ml)', value: 'ml' },
  { label: 'Pacote (pct)', value: 'pacote' },
  { label: 'Caixa (cx)', value: 'caixa' },
  { label: 'Lata (lt)', value: 'lata' },
  { label: 'Dúzia (dz)', value: 'dz' },
];

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('un');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar catálogo de produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setDefaultPrice('');
    setDefaultUnit('un');
    setCategoryId('');
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setDefaultPrice(prod.defaultPrice ? prod.defaultPrice.toString() : '');
    setDefaultUnit(prod.defaultUnit || 'un');
    setCategoryId(prod.categoryId || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      const parsedPrice = defaultPrice ? parseFloat(defaultPrice) : null;

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name,
          defaultPrice: parsedPrice,
          defaultUnit,
          categoryId: categoryId || null,
        });
      } else {
        await api.createProduct({
          name,
          defaultPrice: parsedPrice,
          defaultUnit,
          categoryId: categoryId || null,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o produto "${name}"?`)) {
      return;
    }

    try {
      await api.deleteProduct(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto.');
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategoryFilter ? p.categoryId === selectedCategoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Meus Produtos
          </h2>
          <p className="text-sm text-gray-500">
            Cadastre os produtos que você costuma comprar com preços e unidades padrão.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-3 text-sm text-gray-500 font-medium">Carregando produtos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h4 className="font-bold text-gray-800">Nenhum produto encontrado</h4>
          <p className="text-sm text-gray-500 mt-1">
            {search || selectedCategoryFilter
              ? 'Tente ajustar os filtros de busca.'
              : 'Clique em "Novo Produto" para adicionar itens ao seu catálogo!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                    {prod.name}
                  </h3>
                  {prod.category && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: prod.category.color || '#10B981' }}
                    >
                      {prod.category.name}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Unidade: <strong className="text-gray-700">{prod.defaultUnit}</strong>
                  </span>
                  {prod.defaultPrice && (
                    <span>
                      Preço est.: <strong className="text-emerald-600">{formatCurrency(prod.defaultPrice)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-1">
                <button
                  onClick={() => openEditModal(prod)}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg transition"
                  title="Editar Produto"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(prod.id, prod.name)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition"
                  title="Excluir Produto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leite Integral, Arroz 5kg, Detergente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Unidade Padrão
                  </label>
                  <select
                    value={defaultUnit}
                    onChange={(e) => setDefaultUnit(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Preço Padrão (R$ - Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00 (Opcional)"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Sem Categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                  {saving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
