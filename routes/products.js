// ecommerce-backend/routes/products.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename:    (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2,5)}${ext}`);
  }
});
const upload = multer({ storage });

// GET all products
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        product_id      AS id,
        name,
        description,
        price,
        stock_quantity AS "stockQuantity",
        category,
        image_url       AS "imageUrl"
      FROM products
      ORDER BY product_id;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE product (single image)
router.post(
  '/',
  upload.single('image'),
  async (req, res) => {
    const { name, description, price, stockQuantity, category } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    try {
      const { rows } = await pool.query(
        `INSERT INTO products
           (name, description, price, stock_quantity, category, image_url)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING 
           product_id      AS id,
           name,
           description,
           price,
           stock_quantity AS "stockQuantity",
           category,
           image_url       AS "imageUrl"`,
        [name, description, price, stockQuantity, category, imageUrl]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// UPDATE product (single image optional)
router.put(
  '/:id',
  upload.single('image'),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stockQuantity, category } = req.body;
    // build query dynamically
    let query = `
      UPDATE products
         SET name           = $1,
             description    = $2,
             price          = $3,
             stock_quantity = $4,
             category       = $5`;
    const params = [name, description, price, stockQuantity, category];

    if (req.file) {
      query += `, image_url = $6`;
      params.push(`/uploads/${req.file.filename}`, id);
      query += ` WHERE product_id = $7`;
    } else {
      params.push(id);
      query += ` WHERE product_id = $6`;
    }

    query += `
      RETURNING 
        product_id      AS id,
        name,
        description,
        price,
        stock_quantity AS "stockQuantity",
        category,
        image_url       AS "imageUrl"`;

    try {
      const { rows } = await pool.query(query, params);
      if (!rows.length) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM products WHERE product_id = $1`,
      [req.params.id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
