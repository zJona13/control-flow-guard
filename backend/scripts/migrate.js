import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrateDatabase() {
  let connection;
  
  try {
    console.log('🔄 Iniciando migración de base de datos...');
    
    // Conectar a MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✓ Conexión a MySQL exitosa');

    // Usar la base de datos
    await connection.query(`USE ${process.env.DB_NAME || 'control_flow_guard'}`);

    // Verificar si la tabla citas_contingencia existe
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'citas_contingencia'
    `, [process.env.DB_NAME || 'control_flow_guard']);

    if (tables.length === 0) {
      console.log('⚠️ La tabla citas_contingencia no existe. Creando tabla...');
      
      // Crear la tabla con la nueva estructura
      await connection.query(`
        CREATE TABLE citas_contingencia (
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
          INDEX idx_citas_fecha (fecha),
          INDEX idx_citas_hora (hora),
          INDEX idx_citas_servicio (servicio)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      console.log('✓ Tabla citas_contingencia creada con nueva estructura');
      return;
    }

    // Verificar si existe la columna fecha_hora (estructura antigua)
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

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDatabase()
    .then(() => {
      console.log('✅ Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la migración:', error);
      process.exit(1);
    });
}

export default migrateDatabase;
