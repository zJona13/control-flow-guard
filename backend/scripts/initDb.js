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
    console.log(`📍 Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`👤 User: ${process.env.DB_USER || 'root'}`);
    console.log(`🔐 Password: ${process.env.DB_PASSWORD ? '***configurado***' : 'no configurado'}`);
    console.log(`🗄️ Database: ${process.env.DB_NAME || 'control_flow_guard'}`);
    
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
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();

