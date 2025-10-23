import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import excepcionesRoutes from './routes/excepciones.js';
import citasRoutes from './routes/citas.js';
import { healthCheck } from './health.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

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
    console.log('📍 Variables de entorno detectadas:');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'no configurado'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'no configurado'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? 'configurado' : 'no configurado'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'no configurado'}`);
    
    let connection;
    try {
      // Verificar que las variables de entorno estén configuradas
      if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
        console.log('⚠️ Variables de entorno de MySQL no configuradas completamente');
        console.log('💡 En Railway, estas variables se configuran automáticamente');
        console.log('💡 Verifica que MySQL esté agregado como servicio en Railway');
        return;
      }
      
      // Conectar sin especificar base de datos
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
      });

      console.log('✓ Conexión exitosa a MySQL');

      // Leer el archivo SQL
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const sqlPath = path.join(__dirname, '../sql/mysql_schema.sql');
      let sql = fs.readFileSync(sqlPath, 'utf8');

      console.log('🔄 Ejecutando script SQL...');
      
      // Separar el trigger del resto del SQL porque necesita ejecutarse aparte
      const triggerMatch = sql.match(/(DROP TRIGGER.*?;[\s\S]*?CREATE TRIGGER[\s\S]*?END;)/i);
      const triggerSQL = triggerMatch ? triggerMatch[1] : null;
      
      // Remover el trigger del SQL principal
      if (triggerSQL) {
        sql = sql.replace(triggerSQL, '');
      }
      
      // Ejecutar el SQL principal (sin trigger)
      await connection.query(sql);
      
      // Ejecutar el trigger por separado si existe
      if (triggerSQL) {
        try {
          await connection.query(triggerSQL);
        } catch (err) {
          if (!err.message.includes('Unknown trigger')) {
            console.warn('Advertencia al crear trigger:', err.message);
          }
        }
      }
      
      console.log('✓ Esquema de base de datos creado');

      // Crear usuario administrador con password hasheado
      const adminPassword = 'admin123';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await connection.query(`USE ${process.env.DB_NAME || 'control_flow_guard'}`);
      
      await connection.query(
        `INSERT INTO usuarios (id, email, password_hash, nombres, apellidos, area) 
         VALUES (UUID(), 'admin@essalud.gob.pe', ?, 'Admin', 'Sistema', 'ADMIN')
         ON DUPLICATE KEY UPDATE email=email`,
        [passwordHash]
      );

      console.log('✓ Usuario administrador creado');
      console.log('\n📝 Credenciales de administrador:');
      console.log('   Email: admin@essalud.gob.pe');
      console.log('   Password: admin123');
      console.log('\n✅ Base de datos inicializada correctamente\n');

    } catch (error) {
      console.error('❌ Error al inicializar base de datos:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 Error de conexión: El servidor MySQL no está disponible');
        console.log('💡 En Railway: Verifica que el servicio MySQL esté corriendo');
        console.log('💡 En local: Verifica que Laragon esté iniciado');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('💡 Error de autenticación: Credenciales incorrectas');
        console.log('💡 Verifica las variables DB_USER y DB_PASSWORD');
      } else if (error.code === 'ENOTFOUND') {
        console.log('💡 Error de DNS: No se puede resolver el host');
        console.log('💡 Verifica la variable DB_HOST');
      } else {
        console.log('💡 Error desconocido:', error.code);
      }
      
      console.log('\n🔧 Variables de entorno actuales:');
      console.log(`   DB_HOST: ${process.env.DB_HOST || 'no configurado'}`);
      console.log(`   DB_USER: ${process.env.DB_USER || 'no configurado'}`);
      console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? 'configurado' : 'no configurado'}`);
      console.log(`   DB_NAME: ${process.env.DB_NAME || 'no configurado'}`);
      console.log(`   DB_PORT: ${process.env.DB_PORT || 'no configurado'}`);
    } finally {
      if (connection) {
        await connection.end();
      }
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