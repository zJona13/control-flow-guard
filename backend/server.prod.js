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

      // Crear el esquema SQL directamente usando el esquema completo
      console.log('🔄 Creando esquema de base de datos...');
      
      const sql = `
        -- =========================================================
        --  ESQUEMA PARA MYSQL - CONTROL FLOW GUARD (AJUSTADO)
        -- =========================================================

        CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        USE \`${process.env.DB_NAME}\`;

        -- Drop tables in correct order (child tables first)
        DROP TABLE IF EXISTS cita_exportacion;
        DROP TABLE IF EXISTS export_lotes;
        DROP TABLE IF EXISTS excepcion_acciones;
        DROP TABLE IF EXISTS citas_contingencia;
        DROP TABLE IF EXISTS control_excepciones;
        DROP TABLE IF EXISTS ti_responsables;
        DROP TABLE IF EXISTS usuarios;

        -- 1) Tabla de usuarios
        CREATE TABLE IF NOT EXISTS usuarios (
          id CHAR(36) PRIMARY KEY,                         -- sin DEFAULT UUID()
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          nombres VARCHAR(100) NOT NULL,
          apellidos VARCHAR(100) NOT NULL,
          area ENUM('ADMIN', 'TI', 'CLINICO') NOT NULL,
          activo BOOLEAN DEFAULT TRUE,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_area (area)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 2) Parámetros para MEA02
        CREATE TABLE IF NOT EXISTS ti_responsables (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          categoria ENUM('FALLA_BACKUP','ACCESO_INAPROPIADO','INCIDENTE_SEGURIDAD','DISPONIBILIDAD','OTRO') NOT NULL UNIQUE,
          responsable_id CHAR(36) NOT NULL,
          sla_dias INT NOT NULL CHECK (sla_dias BETWEEN 1 AND 60),
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
          INDEX idx_categoria (categoria)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 3) Excepciones de Control (MEA02)
        CREATE TABLE IF NOT EXISTS control_excepciones (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          descripcion TEXT NOT NULL,
          fecha DATE NOT NULL,
          categoria ENUM('FALLA_BACKUP','ACCESO_INAPROPIADO','INCIDENTE_SEGURIDAD','DISPONIBILIDAD','OTRO') NOT NULL,
          responsable_id CHAR(36),
          fecha_limite DATE,
          estado ENUM('ABIERTO','EN_PROGRESO','CERRADO') NOT NULL DEFAULT 'ABIERTO',
          causa_raiz TEXT,
          creado_por CHAR(36) NOT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL,
          FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
          INDEX idx_excep_estado (estado),
          INDEX idx_excep_fecha_limite (fecha_limite),
          INDEX idx_excep_categoria (categoria),
          INDEX idx_excep_creado_en (creado_en)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 4) Bitácora de acciones correctivas (RF 1.3)
        CREATE TABLE IF NOT EXISTS excepcion_acciones (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          excepcion_id BIGINT NOT NULL,
          autor_id CHAR(36) NOT NULL,
          detalle TEXT NOT NULL,
          nuevo_estado ENUM('ABIERTO','EN_PROGRESO','CERRADO'),
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (excepcion_id) REFERENCES control_excepciones(id) ON DELETE CASCADE,
          FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
          INDEX idx_acciones_excepcion (excepcion_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 5) Citas de contingencia (DSS04)
        CREATE TABLE IF NOT EXISTS citas_contingencia (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          dni VARCHAR(8) NOT NULL CHECK (dni REGEXP '^[0-9]{8}$'),
          nombre_completo VARCHAR(200) NOT NULL,
          servicio VARCHAR(100) NOT NULL,
          medico_asignado VARCHAR(100) NOT NULL,
          fecha DATE NOT NULL,
          hora TIME NOT NULL,
          estado ENUM('PROGRAMADA','ATENDIDA','CANCELADA') NOT NULL DEFAULT 'PROGRAMADA',
          creado_por CHAR(36) NOT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
          INDEX idx_citas_fecha (fecha),
          INDEX idx_citas_hora (hora),
          INDEX idx_citas_servicio (servicio)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 6) Exportaciones masivas para post-resumption (RF 2.4)
        CREATE TABLE IF NOT EXISTS export_lotes (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          creado_por CHAR(36) NOT NULL,
          descripcion TEXT,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS cita_exportacion (
          export_id BIGINT NOT NULL,
          cita_id BIGINT NOT NULL,
          PRIMARY KEY (export_id, cita_id),
          FOREIGN KEY (export_id) REFERENCES export_lotes(id) ON DELETE CASCADE,
          FOREIGN KEY (cita_id) REFERENCES citas_contingencia(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 7) Vistas para Dashboard
        CREATE OR REPLACE VIEW v_excepciones_abiertas AS
        SELECT categoria, COUNT(*) AS total
        FROM control_excepciones
        WHERE estado <> 'CERRADO'
        GROUP BY categoria;

        CREATE OR REPLACE VIEW v_top5_fallas AS
        SELECT categoria, COUNT(*) AS frecuencia
        FROM control_excepciones
        WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY categoria
        ORDER BY frecuencia DESC
        LIMIT 5;

        CREATE OR REPLACE VIEW v_excepciones_vencidas AS
        SELECT id, descripcion, categoria, responsable_id, fecha_limite, estado
        FROM control_excepciones
        WHERE estado <> 'CERRADO'
          AND fecha_limite IS NOT NULL
          AND fecha_limite < CURDATE();

        -- 8) TRIGGERS (sintaxis compatible con Node.js MySQL driver)

        -- 8.a) Asignar UUID a usuarios.id si viene NULL
        DROP TRIGGER IF EXISTS trg_usuarios_uuid;
        CREATE TRIGGER trg_usuarios_uuid
        BEFORE INSERT ON usuarios
        FOR EACH ROW
        BEGIN
          IF NEW.id IS NULL OR NEW.id = '' THEN
            SET NEW.id = UUID();
          END IF;
        END;

        -- 8.b) Asignación automática de responsable y fecha límite
        DROP TRIGGER IF EXISTS trg_asigna_responsable_excepcion;
        CREATE TRIGGER trg_asigna_responsable_excepcion
        BEFORE INSERT ON control_excepciones
        FOR EACH ROW
        BEGIN
          DECLARE v_responsable_id CHAR(36);
          DECLARE v_sla_dias INT;

          SELECT responsable_id, sla_dias
            INTO v_responsable_id, v_sla_dias
          FROM ti_responsables
          WHERE categoria = NEW.categoria
          LIMIT 1;

          IF v_responsable_id IS NOT NULL THEN
            IF NEW.responsable_id IS NULL THEN
              SET NEW.responsable_id = v_responsable_id;
            END IF;

            IF NEW.fecha_limite IS NULL THEN
              SET NEW.fecha_limite = DATE_ADD(NEW.fecha, INTERVAL v_sla_dias DAY);
            END IF;
          END IF;
        END;

        -- 9) Comentarios
        ALTER TABLE usuarios COMMENT = 'Tabla de usuarios del sistema con autenticación y roles';
        ALTER TABLE ti_responsables COMMENT = 'Categoría -> responsable TI + SLA (días)';
        ALTER TABLE control_excepciones COMMENT = 'Registro de excepciones de control (MEA02)';
        ALTER TABLE excepcion_acciones COMMENT = 'Acciones correctivas y cambios de estado de una excepción';
        ALTER TABLE citas_contingencia COMMENT = 'Citas registradas en contingencia (DRP)';
      `;

      console.log('🔄 Ejecutando script SQL...');
      
      // Ejecutar el SQL completo
      await connection.query(sql);
      
      console.log('✓ Esquema de base de datos creado');

      // Verificar si necesitamos migrar la tabla citas_contingencia
      console.log('🔄 Verificando estructura de tabla citas_contingencia...');
      
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'citas_contingencia' AND COLUMN_NAME = 'fecha_hora'
        `, [process.env.DB_NAME || 'control_flow_guard']);

        if (columns.length > 0) {
          console.log('⚠️ Detectada estructura antigua con fecha_hora. Iniciando migración...');
          
          // Ejecutar migración
          await connection.query(`
            -- Agregar las nuevas columnas
            ALTER TABLE citas_contingencia 
            ADD COLUMN fecha DATE AFTER medico_asignado,
            ADD COLUMN hora TIME AFTER fecha;

            -- Migrar datos existentes desde fecha_hora
            UPDATE citas_contingencia 
            SET 
              fecha = DATE(fecha_hora),
              hora = TIME(fecha_hora)
            WHERE fecha_hora IS NOT NULL;

            -- Hacer las nuevas columnas NOT NULL después de migrar los datos
            ALTER TABLE citas_contingencia 
            MODIFY COLUMN fecha DATE NOT NULL,
            MODIFY COLUMN hora TIME NOT NULL;

            -- Eliminar la columna fecha_hora
            ALTER TABLE citas_contingencia DROP COLUMN fecha_hora;

            -- Actualizar los índices
            DROP INDEX IF EXISTS idx_citas_fecha_hora ON citas_contingencia;
            CREATE INDEX idx_citas_fecha ON citas_contingencia (fecha);
            CREATE INDEX idx_citas_hora ON citas_contingencia (hora);
          `);
          
          console.log('✓ Migración de citas_contingencia completada');
        } else {
          console.log('✓ Estructura de base de datos ya está actualizada');
        }
      } catch (migrationError) {
        console.log('⚠️ Error en migración, continuando con estructura actual:', migrationError.message);
      }

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