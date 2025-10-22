import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import excepcionesRoutes from './routes/excepciones.js';
import citasRoutes from './routes/citas.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Control Flow Guard',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      excepciones: '/api/excepciones',
      citas: '/api/citas'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/excepciones', excepcionesRoutes);
app.use('/api/citas', citasRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: MySQL en Laragon`);
  console.log(`🔐 JWT autenticación habilitada`);
  console.log(`\nEndpoints disponibles:`);
  console.log(`  POST   /api/auth/register`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  GET    /api/auth/profile`);
  console.log(`  GET    /api/excepciones`);
  console.log(`  POST   /api/excepciones`);
  console.log(`  PATCH  /api/excepciones/:id`);
  console.log(`  GET    /api/excepciones/estadisticas`);
  console.log(`  GET    /api/excepciones/ti-users`);
  console.log(`  PATCH  /api/excepciones/:id/assign`);
  console.log(`  GET    /api/citas`);
  console.log(`  POST   /api/citas`);
  console.log(`\n✓ Servidor listo para recibir peticiones\n`);
});

export default app;

