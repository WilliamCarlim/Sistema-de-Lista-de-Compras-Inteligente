const API_BASE = '/api';

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface ListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number | null;
  bought: boolean;
  notes?: string | null;
  createdAt: string;
  listId: string;
  categoryId?: string | null;
  category?: Category | null;
}

export interface ShoppingList {
  id: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  totalItems?: number;
  boughtItems?: number;
  totalSpent?: number;
  totalEstimated?: number;
  items?: ListItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { error: 'Falha ao processar resposta do servidor.' };
  }

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição.');
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const data = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    return data;
  },

  async register(name: string, email: string, password: string) {
    const data = await request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem('token', data.token);
    return data;
  },

  async me() {
    return request<User>('/auth/me');
  },

  logout() {
    localStorage.removeItem('token');
  },

  // Lists
  async getLists() {
    return request<ShoppingList[]>('/lists');
  },

  async createList(title: string, description?: string | null, budget?: number | null) {
    return request<ShoppingList>('/lists', {
      method: 'POST',
      body: JSON.stringify({ title, description, budget }),
    });
  },

  async getListDetails(id: string) {
    return request<ShoppingList & { items: ListItem[] }>(`/lists/${id}`);
  },

  async updateList(id: string, data: Partial<Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'>>) {
    return request<ShoppingList>(`/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteList(id: string) {
    return request<{ message: string }>(`/lists/${id}`, {
      method: 'DELETE',
    });
  },

  async getListSummary(id: string) {
    return request<{
      budget: number;
      totalEstimated: number;
      totalBought: number;
      isOverBudget: boolean;
      remaining: number;
    }>(`/lists/${id}/summary`);
  },

  // Items
  async addItem(
    listId: string,
    itemData: {
      name: string;
      quantity: number;
      unit: string;
      price?: number | null;
      categoryId?: string | null;
      notes?: string | null;
    }
  ) {
    return request<ListItem>(`/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  async toggleItem(itemId: string) {
    return request<ListItem>(`/items/${itemId}/toggle`, {
      method: 'PATCH',
    });
  },

  async updateItem(
    itemId: string,
    itemData: Partial<{
      name: string;
      quantity: number;
      unit: string;
      price: number | null;
      categoryId: string | null;
      notes: string | null;
      bought: boolean;
    }>
  ) {
    return request<ListItem>(`/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },

  async deleteItem(itemId: string) {
    return request<{ message: string }>(`/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  // Categories
  async getCategories() {
    return request<Category[]>('/categories');
  },
};
