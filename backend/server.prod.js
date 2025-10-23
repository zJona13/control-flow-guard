import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import excepcionesRoutes from './routes/excepciones.js';
import citasRoutes from './routes/citas.js';
import { healthCheck } from './health.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint for Railway
app.get('/api/health', healthCheck);

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Control Flow Guard',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      excepciones: '/api/excepciones',
      citas: '/api/citas',
      health: '/api/health'
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

// Función para inicializar la base de datos automáticamente
async function initializeDatabase() {
  if (process.env.AUTO_INIT_DB === 'true') {
    console.log('🔄 Inicializando base de datos automáticamente...');
    try {
      const { spawn } = await import('child_process');
      const initProcess = spawn('npm', ['run', 'db:init'], { 
        stdio: 'inherit',
        shell: true 
      });
      
      initProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Base de datos inicializada automáticamente');
        } else {
          console.log('⚠️ Error al inicializar base de datos automáticamente');
        }
      });
    } catch (error) {
      console.log('⚠️ No se pudo inicializar la base de datos automáticamente:', error.message);
    }
  }
}

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Accesible desde: http://0.0.0.0:${PORT}`);
  console.log(`📊 Base de datos: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`🔐 JWT autenticación habilitada`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Inicializar base de datos si está configurado
  await initializeDatabase();
  
  console.log(`\nEndpoints disponibles:`);
  console.log(`  GET    /api/health`);
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
