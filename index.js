const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Servir la carpeta estática
app.use(express.static('public'));

// Configuración de base de datos RDS
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla de usuarios en RDS
pool.query(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    mfa_secret VARCHAR(100) NOT NULL
  );
`).then(() => console.log('📦 Tabla de usuarios lista en RDS'))
  .catch(err => console.error('❌ Error creando tabla:', err));

// 1. REGISTRO DE USUARIO
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const secret = speakeasy.generateSecret({ name: `CruzAzul (${username})` });
    
    await pool.query(
      'INSERT INTO usuarios (username, password, mfa_secret) VALUES ($1, $2, $3)',
      [username, password, secret.base32]
    );

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    
    res.status(201).json({ 
      mensaje: 'Usuario registrado con éxito',
      qr_code: qrCodeUrl,
      secret: secret.base32 
    });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 2. LOGIN + MFA
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, mfa_token } = req.body;

    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
    
    const user = result.rows[0];

    if (user.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const mfaValido = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: mfa_token
    });

    if (!mfaValido) return res.status(401).json({ error: 'Código MFA inválido' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secreto', { expiresIn: '1h' });
    
    res.json({ token, redirect: '/dashboard.html' });
  } catch (error) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`🚀 Servidor unificado corriendo en el puerto ${PORT}`));