import React, { useEffect, useState } from 'react';
import { ShoppingBag, Package, Tag, User as UserIcon, LogOut } from 'lucide-react';
import { api, User } from './services/api.ts';
import { LoginRegister } from './pages/LoginRegister.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { ListDetails } from './pages/ListDetails.tsx';
import { CategoriesPage } from './pages/CategoriesPage.tsx';
import { ProductsPage } from './pages/ProductsPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';

type Tab = 'lists' | 'products' | 'categories' | 'profile';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('lists');
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth session
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await api.me();
        setUser(currentUser);
      } catch (err) {
        console.error('Session error:', err);
        api.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveTab('lists');
    setCurrentListId(null);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentListId(null);
    setActiveTab('lists');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Iniciando aplicação...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado, exibe tela de login / cadastro
  if (!user) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                setActiveTab('lists');
                setCurrentListId(null);
              }}
            >
              <div className="bg-emerald-600 text-white p-2 rounded-xl">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Lista Inteligente</h1>
                <p className="text-[11px] text-emerald-600 font-semibold">Minha Conta</p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveTab('lists');
                  setCurrentListId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  activeTab === 'lists'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                Listas
              </button>

              <button
                onClick={() => {
                  setActiveTab('products');
                  setCurrentListId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  activeTab === 'products'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Package className="h-4 w-4" />
                Produtos
              </button>

              <button
                onClick={() => {
                  setActiveTab('categories');
                  setCurrentListId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  activeTab === 'categories'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Tag className="h-4 w-4" />
                Categorias
              </button>

              <button
                onClick={() => {
                  setActiveTab('profile');
                  setCurrentListId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  activeTab === 'profile'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                Perfil
              </button>
            </nav>

            {/* Logout Button */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-gray-500">
                Olá, <strong className="text-gray-800">{user.name.split(' ')[0]}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 font-semibold p-2 rounded-xl hover:bg-red-50 transition"
                title="Sair da Conta"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Bar */}
          <nav className="flex md:hidden items-center justify-around border-t border-gray-100 py-2">
            <button
              onClick={() => {
                setActiveTab('lists');
                setCurrentListId(null);
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-3 rounded-lg ${
                activeTab === 'lists' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Listas
            </button>

            <button
              onClick={() => {
                setActiveTab('products');
                setCurrentListId(null);
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-3 rounded-lg ${
                activeTab === 'products' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500'
              }`}
            >
              <Package className="h-4 w-4" />
              Produtos
            </button>

            <button
              onClick={() => {
                setActiveTab('categories');
                setCurrentListId(null);
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-3 rounded-lg ${
                activeTab === 'categories' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500'
              }`}
            >
              <Tag className="h-4 w-4" />
              Categorias
            </button>

            <button
              onClick={() => {
                setActiveTab('profile');
                setCurrentListId(null);
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-3 rounded-lg ${
                activeTab === 'profile' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              Perfil
            </button>
          </nav>
        </div>
      </header>

      {/* Main Tab Views */}
      <main className="flex-1">
        {activeTab === 'lists' && (
          currentListId ? (
            <ListDetails listId={currentListId} onBack={() => setCurrentListId(null)} />
          ) : (
            <Dashboard user={user} onSelectList={(id) => setCurrentListId(id)} />
          )
        )}

        {activeTab === 'products' && <ProductsPage />}

        {activeTab === 'categories' && <CategoriesPage />}

        {activeTab === 'profile' && (
          <ProfilePage
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
