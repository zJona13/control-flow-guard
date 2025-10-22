import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  let connection;

  try {
    console.log('🔄 Conectando a MySQL...');
    
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✓ Conexión exitosa a MySQL');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../../sql/mysql_schema.sql');
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
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();

