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

      // Crear el esquema SQL directamente
      console.log('🔄 Creando esquema de base de datos...');
      
      const sql = `
        -- Crear base de datos si no existe
        CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;
        USE \`${process.env.DB_NAME}\`;

        -- Tabla de usuarios
        CREATE TABLE IF NOT EXISTS usuarios (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          nombres VARCHAR(100) NOT NULL,
          apellidos VARCHAR(100) NOT NULL,
          area ENUM('ADMIN', 'TI', 'CONTROL_INTERNO', 'ADMISION', 'CLINICO') NOT NULL,
          activo BOOLEAN DEFAULT TRUE,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );

        -- Tabla de excepciones de control
        CREATE TABLE IF NOT EXISTS control_excepciones (
          id INT AUTO_INCREMENT PRIMARY KEY,
          descripcion TEXT NOT NULL,
          fecha DATE NOT NULL,
          categoria VARCHAR(100) NOT NULL,
          estado ENUM('PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CERRADO') DEFAULT 'PENDIENTE',
          responsable_id VARCHAR(36),
          creado_por VARCHAR(36) NOT NULL,
          fecha_limite DATE,
          causa_raiz TEXT,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (responsable_id) REFERENCES usuarios(id),
          FOREIGN KEY (creado_por) REFERENCES usuarios(id)
        );

        -- Tabla de acciones correctivas
        CREATE TABLE IF NOT EXISTS excepcion_acciones (
          id INT AUTO_INCREMENT PRIMARY KEY,
          excepcion_id INT NOT NULL,
          accion TEXT NOT NULL,
          responsable_id VARCHAR(36) NOT NULL,
          fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          estado ENUM('PENDIENTE', 'COMPLETADO', 'CANCELADO') DEFAULT 'PENDIENTE',
          FOREIGN KEY (excepcion_id) REFERENCES control_excepciones(id) ON DELETE CASCADE,
          FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
        );

        -- Tabla de citas de contingencia
        CREATE TABLE IF NOT EXISTS citas_contingencia (
          id INT AUTO_INCREMENT PRIMARY KEY,
          dni VARCHAR(8) NOT NULL,
          nombre_completo VARCHAR(200) NOT NULL,
          servicio VARCHAR(100) NOT NULL,
          medico_asignado VARCHAR(100) NOT NULL,
          fecha_hora DATETIME NOT NULL,
          estado ENUM('PROGRAMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO') DEFAULT 'PROGRAMADA',
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );

        -- Tabla de responsables TI por categoría
        CREATE TABLE IF NOT EXISTS ti_responsables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          categoria VARCHAR(100) NOT NULL,
          responsable_id VARCHAR(36) NOT NULL,
          activo BOOLEAN DEFAULT TRUE,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
        );

        -- Trigger para asignar responsable automáticamente
        DELIMITER //
        CREATE TRIGGER IF NOT EXISTS asignar_responsable_ti
        AFTER INSERT ON control_excepciones
        FOR EACH ROW
        BEGIN
          DECLARE responsable_id VARCHAR(36);
          SELECT tr.responsable_id INTO responsable_id
          FROM ti_responsables tr
          WHERE tr.categoria = NEW.categoria AND tr.activo = TRUE
          LIMIT 1;
          
          IF responsable_id IS NOT NULL THEN
            UPDATE control_excepciones 
            SET responsable_id = responsable_id,
                fecha_limite = DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            WHERE id = NEW.id;
          END IF;
        END//
        DELIMITER ;
      `;

      console.log('🔄 Ejecutando script SQL...');
      
      // Ejecutar el SQL completo
      await connection.query(sql);
      
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