const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Importante: ejecutar npm install jsonwebtoken
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Configuración de base de datos
const pool = new Pool({
  host: process.env.DB_HOST,     // Aquí irá la URL de tu RDS (ej: cruz-azul.cxyz.us-east-1.rds.amazonaws.com)
  user: process.env.DB_USER,     // El usuario que creaste en RDS
  password: process.env.DB_PASSWORD, // La contraseña que definiste en RDS
  database: process.env.DB_NAME, // El nombre de la base de datos dentro del RDS
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false    // Necesario para conectar a AWS RDS desde Node.js
  }
});

// El "Guardian": middleware que verifica el token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // El token viene como "Bearer <TOKEN>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "No autorizado: Token requerido" });

    // Validar con la misma clave secreta que usa tu autenticador
    jwt.verify(token, process.env.JWT_SECRET || 'secreto_super_seguro_cruz_azul_2026', (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido o expirado" });
        req.user = user;
        next();
    });
};

// Rutas protegidas por el "Guardian"
app.get('/api/productos', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', authenticateToken, async (req, res) => {
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

// Puerto 3001 para coexistir con el autenticador
app.listen(3001, () => console.log('ERP Cruz Azul (Protegido con JWT) corriendo en puerto 3001'));