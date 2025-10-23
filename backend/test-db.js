#!/usr/bin/env node

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testDatabase() {
  let connection;
  
  try {
    console.log('🔄 Probando conexión a la base de datos...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'control_flow_guard',
      port: process.env.DB_PORT || 3306
    });

    console.log('✓ Conexión a MySQL exitosa');

    // Verificar si la tabla citas_contingencia existe y su estructura
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'citas_contingencia'
    `, [process.env.DB_NAME || 'control_flow_guard']);

    if (tables.length === 0) {
      console.log('❌ La tabla citas_contingencia no existe');
      return;
    }

    console.log('✓ Tabla citas_contingencia existe');

    // Verificar la estructura de la tabla
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'citas_contingencia'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'control_flow_guard']);

    console.log('\n📋 Estructura de la tabla citas_contingencia:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Verificar si hay datos
    const [count] = await connection.query('SELECT COUNT(*) as total FROM citas_contingencia');
    console.log(`\n📊 Total de registros: ${count[0].total}`);

    if (count[0].total > 0) {
      // Mostrar algunos registros de ejemplo
      const [samples] = await connection.query('SELECT * FROM citas_contingencia LIMIT 3');
      console.log('\n📝 Registros de ejemplo:');
      samples.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}, DNI: ${record.dni}, Fecha: ${record.fecha || 'N/A'}, Hora: ${record.hora || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error al probar la base de datos:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Error de conexión: El servidor MySQL no está disponible');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Error de autenticación: Credenciales incorrectas');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Error de DNS: No se puede resolver el host');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testDatabase();
