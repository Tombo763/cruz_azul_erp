require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Conexión a la base de datos RDS usando las variables del .env
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl:{
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log(' Conectado a AWS RDS PostgreSQL exitosamente'))
  .catch(err => console.error(' Error conectando a RDS:', err));

// Endpoint 1: Generar código MFA para la aplicación (ej. Google Authenticator)
app.post('/api/mfa/setup', (req, res) => {
  const secret = speakeasy.generateSecret({ name: "Farmacia Cruz Azul (ERP)" });
  qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
    // El secreto en base32 es lo que guardarías en la BD para este usuario en producción
    res.json({ secret: secret.base32, qr_code: data_url });
  });
});

// Endpoint 2: Login con validación de Token MFA (Acceso condicional)
app.post('/api/login', (req, res) => {
  const { username, password, mfa_token, user_secret } = req.body;

  // Validación básica para la prueba de concepto
  if (username === 'admin' && password === '1234') {
    
    // Verificar el token MFA (los 6 dígitos) que ingresa el usuario
    const verified = speakeasy.totp.verify({
      secret: user_secret,
      encoding: 'base32',
      token: mfa_token
    });

    if (verified) {
      // Si el código del celular es correcto, generamos el JWT para acceder al sitio
      const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login exitoso - Acceso concedido', token: token });
    } else {
      res.status(401).json({ error: 'Token MFA inválido o expirado' });
    }
  } else {
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ERP corriendo en el puerto ${PORT}`);
});
