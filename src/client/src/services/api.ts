const API_BASE = '/api';

export interface Category {
  id: string;
  name: string;
  color?: string;
  _count?: {
    products: number;
    items: number;
  };
}

export interface Product {
  id: string;
  name: string;
  defaultPrice?: number | null;
  defaultUnit: string;
  categoryId?: string | null;
  category?: Category | null;
  createdAt: string;
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
  productId?: string | null;
  product?: Product | null;
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

export interface ReportsSummary {
  totalSpent: number;
  totalEstimated: number;
  totalBudget: number;
  budgetSavings: number;
  totalLists: number;
  completedLists: number;
  activeLists: number;
  totalItemsInLists: number;
  totalProductsInLists: number;
  totalItemsBought: number;
  totalProductsBought: number;
  avgSpentPerList: number;
}

export interface CategoryReport {
  id: string;
  name: string;
  color: string;
  totalSpent: number;
  itemsCount: number;
  percentage: number;
}

export interface MonthReport {
  monthKey: string;
  monthLabel: string;
  totalSpent: number;
  listCount: number;
  itemsCount: number;
}

export interface TopProductReport {
  name: string;
  unit: string;
  categoryName: string;
  categoryColor: string;
  totalSpent: number;
  totalQuantity: number;
  purchaseCount: number;
}

export interface ListPerformanceReport {
  id: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  createdAt: string;
  budget?: number | null;
  totalSpent: number;
  totalEstimated: number;
  totalItems: number;
  boughtItems: number;
  isOverBudget: boolean;
  difference?: number | null;
}

export interface ReportsData {
  period: string;
  availableYears?: number[];
  summary: ReportsSummary;
  byCategory: CategoryReport[];
  byMonth: MonthReport[];
  topProductsBySpent: TopProductReport[];
  topProductsByQuantity: TopProductReport[];
  listPerformance: ListPerformanceReport[];
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
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
  // Auth & Profile
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

  async updateProfile(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    return request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  logout() {
    localStorage.removeItem('token');
  },

  // Categories CRUD
  async getCategories() {
    return request<Category[]>('/categories');
  },

  async createCategory(name: string, color?: string) {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  },

  async updateCategory(id: string, name: string, color?: string) {
    return request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color }),
    });
  },

  async deleteCategory(id: string) {
    return request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Products CRUD
  async getProducts() {
    return request<Product[]>('/products');
  },

  async createProduct(data: {
    name: string;
    defaultPrice?: number | null;
    defaultUnit?: string;
    categoryId?: string | null;
  }) {
    return request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      defaultPrice: number | null;
      defaultUnit: string;
      categoryId: string | null;
    }>
  ) {
    return request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id: string) {
    return request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Lists CRUD
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

  // Items CRUD
  async addItem(
    listId: string,
    itemData: {
      name: string;
      quantity: number;
      unit: string;
      price?: number | null;
      categoryId?: string | null;
      productId?: string | null;
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
      productId: string | null;
      notes: string | null;
      bought: boolean;
      updateProductPrice: boolean;
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

  // Reports
  async getReports(period: string = 'all', year?: number) {
    const query = new URLSearchParams({ period });
    if (year) query.append('year', year.toString());
    return request<ReportsData>(`/reports?${query.toString()}`);
  },
};
