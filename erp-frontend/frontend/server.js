const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  host: process.env.DB_HOST || 'db-server',
  database: process.env.DB_NAME || 'cruz_azul_db',
  user: process.env.DB_USER || 'farmacia_user',
  password: process.env.DB_PASSWORD || 'CruzAzul2024!',
  port: 5432
});

app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria } = req.body;
    const result = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, stock, categoria) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nombre, descripcion, precio, stock, categoria]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('ERP Cruz Azul corriendo en puerto 3000'));