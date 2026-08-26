import React, { useEffect, useState } from 'react';
import { api, User } from './services/api.ts';
import { LoginRegister } from './pages/LoginRegister.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { ListDetails } from './pages/ListDetails.tsx';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
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
        console.error('Session expired or invalid token:', err);
        api.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentListId(null);
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

  // Not authenticated
  if (!user) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  // Authenticated: show details or dashboard
  if (currentListId) {
    return (
      <ListDetails
        listId={currentListId}
        onBack={() => setCurrentListId(null)}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onSelectList={(id) => setCurrentListId(id)}
    />
  );
}

export default App;
