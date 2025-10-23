#!/usr/bin/env node

import dotenv from 'dotenv';
import migrateDatabase from './scripts/migrate.js';

// Cargar variables de entorno
dotenv.config();

console.log('🚀 Ejecutando migración de base de datos...');

migrateDatabase()
  .then(() => {
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  });
