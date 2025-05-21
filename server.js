// server.js
console.log('👀 server.js loaded—about to boot Express…');

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION:', err);
});
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const compression = require('compression');
const path        = require('path');
import pool from './db.js';

const productsRouter = require('./routes/products');
const ordersRouter   = require('./routes/orders');
const authRouter     = require('./routes/auth');

const app = express();

// --- Middleware ---
app.use(compression());

// Configure CORS to only allow your frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'public', 'uploads'))
);

// --- Routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api/auth',    authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders',   ordersRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

