// server.js
import 'dotenv/config';                     // loads .env automatically
import express       from 'express';
import cors          from 'cors';
import compression   from 'compression';
import path          from 'path';
import { fileURLToPath } from 'url';

import pool          from './db.js';
import productsRouter from './routes/products.js';
import ordersRouter   from './routes/orders.js';
import authRouter     from './routes/auth.js';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// --- Middleware ---
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'public', 'uploads'))
);

// --- Routes ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK' });
});
app.use('/api/auth',    authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders',   ordersRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
