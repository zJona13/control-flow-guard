import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'control_flow_guard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: '+00:00'
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✓ Conexión a MySQL exitosa');
    connection.release();
  })
  .catch(err => {
    console.error('✗ Error al conectar a MySQL:', err.message);
    console.error('Asegúrese de que MySQL esté corriendo en Laragon y la base de datos exista');
  });

export default pool;

