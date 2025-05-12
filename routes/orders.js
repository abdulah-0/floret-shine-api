// routes/orders.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Ensure the uploads/payments directory exists
const paymentsDir = path.join(__dirname, '..', 'public', 'uploads', 'payments');
if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir, { recursive: true });
}

// Multer configuration for payment photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, paymentsDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `payment_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// ── GET /api/orders ─────────────────────────────────────────────────────────────
// List all orders (admin view)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        order_id           AS id,
        first_name         AS "firstName",
        last_name          AS "lastName",
        country,
        address,
        city,
        postal_code        AS "postalCode",
        phone,
        payment_method     AS "paymentMethod",
        payment_photo_url  AS "paymentPhotoUrl",
        amount_paid        AS "amountPaid",
        status,
        created_at         AS "createdAt"
      FROM orders
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PATCH /api/orders/:id/status ────────────────────────────────────────────────
// Update a single order's status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['pending', 'shipped', 'canceled'];

  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE orders
         SET status = $1
       WHERE order_id = $2
       RETURNING order_id AS id, status`,
      [status, id]
    );

    if (!rowCount) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/orders/:id ───────────────────────────────────────────────────────
// Delete an order and its items
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // If order_items does not have ON DELETE CASCADE, remove them explicitly:
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [id]);

    const { rowCount } = await pool.query(
      'DELETE FROM orders WHERE order_id = $1',
      [id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/orders ─────────────────────────────────────────────────────────────
// Create a new order with optional payment photo
router.post('/', upload.single('paymentPhoto'), async (req, res) => {
  const {
    items,
    country,
    firstName,
    lastName,
    address,
    city,
    postalCode,
    phone,
    saveInfo,
    paymentMethod
  } = req.body;

  // Parse line items
  let orderItems;
  try {
    orderItems = JSON.parse(items);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid items payload' });
  }

  // Build payment photo URL if one was uploaded
  const paymentPhotoUrl = req.file
    ? `/uploads/payments/${req.file.filename}`
    : null;

  // Compute total amount (if your items include price)
  const amountPaid = orderItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0
  );

  try {
    await pool.query('BEGIN');

    // Insert order
    const { rows } = await pool.query(
      `INSERT INTO orders
         (first_name, last_name, country, address, city,
          postal_code, phone, save_info, payment_method,
          payment_photo_url, amount_paid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING order_id AS id`,
      [
        firstName,
        lastName,
        country,
        address,
        city,
        postalCode,
        phone,
        saveInfo === 'true',
        paymentMethod,
        paymentPhotoUrl,
        amountPaid
      ]
    );
    const orderId = rows[0].id;

    // Insert each line item
    const insertItemSql =
      'INSERT INTO order_items(order_id, product_id, quantity) VALUES ($1,$2,$3)';
    for (const item of orderItems) {
      await pool.query(insertItemSql, [orderId, item.id, item.quantity]);
    }

    await pool.query('COMMIT');
    res.json({ success: true, orderId });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
