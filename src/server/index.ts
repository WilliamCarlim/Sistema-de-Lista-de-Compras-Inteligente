import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { login, register, me } from './controllers/authController.js';
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
import { getCategories } from './controllers/categoryController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas de Autenticação
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, me);

// Rotas de Listas de Compras
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

// Rotas de Categorias
app.get('/api/categories', getCategories);

// Servir frontend compilado
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
