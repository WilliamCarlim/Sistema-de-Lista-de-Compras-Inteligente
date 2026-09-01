import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { prisma } from './prisma.js';

import { login, register, me, updateProfile } from './controllers/authController.js';
import { authMiddleware } from './middleware/auth.js';
import {
  getLists,
  createList,
  getListDetails,
  updateList,
  deleteList,
  getListSummary,
} from './controllers/listController.js';
import { addItem, toggleItem, updateItem, deleteItem } from './controllers/itemController.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './controllers/categoryController.js';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './controllers/productController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Healthcheck ativo: consulta o Supabase para resetar a inatividade de 7 dias
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok', database: 'connected', time: new Date() });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', database: err.message, time: new Date() });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok', database: 'connected', time: new Date() });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', database: err.message, time: new Date() });
  }
});

// Rotas de Autenticação e Usuário
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, me);
app.put('/api/auth/me', authMiddleware, updateProfile);

// Rotas de Categorias (CRUD isolado por usuário)
app.get('/api/categories', authMiddleware, getCategories);
app.post('/api/categories', authMiddleware, createCategory);
app.put('/api/categories/:id', authMiddleware, updateCategory);
app.delete('/api/categories/:id', authMiddleware, deleteCategory);

// Rotas de Produtos (CRUD isolado por usuário)
app.get('/api/products', authMiddleware, getProducts);
app.post('/api/products', authMiddleware, createProduct);
app.put('/api/products/:id', authMiddleware, updateProduct);
app.delete('/api/products/:id', authMiddleware, deleteProduct);

// Rotas de Listas de Compras (CRUD isolado por usuário)
app.get('/api/lists', authMiddleware, getLists);
app.post('/api/lists', authMiddleware, createList);
app.get('/api/lists/:id', authMiddleware, getListDetails);
app.put('/api/lists/:id', authMiddleware, updateList);
app.delete('/api/lists/:id', authMiddleware, deleteList);
app.get('/api/lists/:id/summary', authMiddleware, getListSummary);

// Rotas de Itens da Lista
app.post('/api/lists/:id/items', authMiddleware, addItem);
app.patch('/api/items/:id/toggle', authMiddleware, toggleItem);
app.put('/api/items/:id', authMiddleware, updateItem);
app.delete('/api/items/:id', authMiddleware, deleteItem);

// Servir frontend compilado
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Auto-ping interno: mantém a Render acordada e o Supabase com consultas ativas
function startSelfPing() {
  const targetUrl =
    process.env.RENDER_EXTERNAL_URL || 'https://supermarket-shopping-list.onrender.com';

  if (process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
    const PING_INTERVAL = 10 * 60 * 1000; // a cada 10 minutos
    console.log(`[Self-Ping] Ativado para ${targetUrl}/health (Render + Supabase Keep-Alive)`);

    setInterval(async () => {
      try {
        const res = await fetch(`${targetUrl}/health`);
        const json = await res.json();
        console.log(`[Self-Ping] Ping executado com sucesso:`, json);
      } catch (err: any) {
        console.error(`[Self-Ping] Erro no ping:`, err.message);
      }
    }, PING_INTERVAL);
  }
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  startSelfPing();
});
