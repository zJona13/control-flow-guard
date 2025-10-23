# 🚀 Guía de Despliegue - Control Flow Guard

Esta guía te ayudará a desplegar tu aplicación de forma gratuita para presentaciones paso a paso.

## 📋 Opciones de Despliegue Gratuito

### 🎯 RECOMENDADO para Presentaciones

**Frontend**: Vercel (gratuito, perfecto para React)
**Backend**: Railway (gratuito con límites generosos)
**Base de datos**: MySQL automática en Railway

---

## 🔧 PASOS DETALLADOS PARA DESPLEGAR

### 📝 PREPARACIÓN INICIAL

1. **Asegúrate de tener todo committeado**:
   ```bash
   git add .
   git commit -m "Listo para despliegue"
   git push origin main
   ```

2. **Verifica que el build funciona localmente**:
   ```bash
   npm run build
   ```

---

## 🚂 PASO 1: Desplegar Backend en Railway

### 1.1 Crear cuenta en Railway
- Ve a [Railway.app](https://railway.app)
- Haz clic en "Sign Up" y conecta con GitHub

### 1.2 Crear nuevo proyecto
- Haz clic en "New Project"
- Selecciona "Deploy from GitHub repo"
- Busca y selecciona tu repositorio `control-flow-guard`

### 1.3 Configurar el servicio Backend
- Railway detectará automáticamente que hay una carpeta `backend`
- Haz clic en "Add Service" → "GitHub Repo"
- Selecciona tu repo y configura:
  - **Root Directory**: `backend`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`

### 1.4 Agregar Base de Datos MySQL
- En el dashboard de Railway, haz clic en "New"
- Selecciona "Database" → "MySQL"
- Railway creará automáticamente la base de datos
- **IMPORTANTE**: Railway agregará automáticamente las variables de entorno:
  - `DB_HOST`
  - `DB_USER` 
  - `DB_PASSWORD`
  - `DB_NAME`
  - `DB_PORT`

### 1.5 Configurar Variables de Entorno
En el servicio de tu backend, ve a "Variables" y agrega:

```env
NODE_ENV=production
JWT_SECRET=tu-secreto-jwt-super-seguro-para-produccion-2024
FRONTEND_URL=https://tu-app.vercel.app
```

**IMPORTANTE**: Las credenciales de MySQL se configurarán automáticamente. Railway las agregará como variables de entorno automáticamente.

### 1.6 Obtener URL del Backend
- Una vez desplegado, Railway te dará una URL como: `https://tu-proyecto-production.up.railway.app`
- **COPIA ESTA URL** - la necesitarás para el frontend

---

## 🌐 PASO 2: Desplegar Frontend en Vercel

### 2.1 Crear cuenta en Vercel
- Ve a [Vercel.com](https://vercel.com)
- Haz clic en "Sign Up" y conecta con GitHub

### 2.2 Importar proyecto
- Haz clic en "New Project"
- Selecciona tu repositorio `control-flow-guard`
- Vercel detectará automáticamente que es un proyecto Vite

### 2.3 Configurar el proyecto
Asegúrate de que la configuración sea:
- **Framework Preset**: `Vite`
- **Root Directory**: `.` (raíz del proyecto)
- **Build Command**: `npm ci && npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`

### 2.4 Configurar Variables de Entorno
En la sección "Environment Variables", agrega:
```env
VITE_API_URL=https://tu-backend.railway.app
```
**IMPORTANTE**: Reemplaza `https://tu-backend.railway.app` con la URL real de tu backend de Railway.

### 2.5 Desplegar
- Haz clic en "Deploy"
- Espera a que termine el build (2-3 minutos)

---

## 🗄️ PASO 3: Inicializar Base de Datos

### 3.1 Acceder al terminal de Railway
- Ve al dashboard de Railway
- Selecciona tu servicio backend
- Haz clic en la pestaña "Deployments"
- Haz clic en el deployment más reciente
- Haz clic en "View Logs"
- En la parte superior derecha de los logs, busca el ícono de terminal (⚡) o "Shell"
- Haz clic en "Open Shell" o "Terminal"

**Alternativa**: Si no encuentras "Open Shell":
- Ve a la pestaña "Settings" de tu servicio
- Busca la sección "Deploy" 
- Haz clic en "Redeploy" y durante el proceso podrás acceder al terminal

**Nota**: La interfaz de Railway cambia frecuentemente. Si no encuentras el terminal:
1. Busca un ícono de terminal (⚡) en la parte superior de los logs
2. Busca un botón "Shell" o "Terminal" 
3. Algunas versiones tienen el terminal en la pestaña "Deployments" → "View Logs" → ícono de terminal
4. Si nada funciona, usa el método automático de abajo

### 3.2 Ejecutar script de inicialización
En el terminal de Railway, ejecuta:
```bash
npm run db:init
```

Esto creará:
- ✅ Todas las tablas necesarias
- ✅ Usuario administrador inicial
- ✅ Datos de ejemplo

### 3.3 Método Alternativo: Inicialización Automática
Si no puedes acceder al terminal, Railway puede inicializar la base de datos automáticamente:

1. Ve a la pestaña "Variables" de tu servicio backend
2. Agrega esta variable de entorno:
   ```env
   AUTO_INIT_DB=true
   ```
3. Haz clic en "Redeploy" para aplicar los cambios
4. Railway ejecutará automáticamente el script de inicialización

### 3.4 Verificar que funcionó
Deberías ver mensajes como:
```
✅ Base de datos inicializada correctamente
📝 Credenciales de administrador:
   Email: admin@essalud.gob.pe
   Password: admin123
```

---

## 🔗 PASO 4: Configurar URLs Finales

### 4.1 Actualizar Frontend con URL del Backend
- Ve a Vercel Dashboard
- Selecciona tu proyecto
- Ve a "Settings" → "Environment Variables"
- Actualiza `VITE_API_URL` con la URL real de Railway
- Haz clic en "Redeploy" para aplicar los cambios

### 4.2 Actualizar Backend con URL del Frontend
- Ve a Railway Dashboard
- Selecciona tu servicio backend
- Ve a "Variables"
- Actualiza `FRONTEND_URL` con la URL de Vercel
- Railway redeployará automáticamente

---

## ✅ PASO 5: Verificar que Todo Funciona

### 5.1 Probar el Backend
Visita: `https://tu-backend.railway.app/api/health`
Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### 5.2 Probar el Frontend
Visita: `https://tu-app.vercel.app`
- Debería cargar la página de login
- Intenta hacer login con:
  - **Email**: `admin@essalud.gob.pe`
  - **Password**: `admin123`

### 5.3 Probar la Conexión Completa
- Haz login en el frontend
- Navega por las diferentes secciones
- Verifica que los datos se cargan correctamente

---

## 🔐 Credenciales de Acceso

### Usuario Administrador
- **Email**: `admin@essalud.gob.pe`
- **Password**: `admin123`

### URLs de Acceso
- **Frontend**: `https://tu-app.vercel.app`
- **Backend API**: `https://tu-backend.railway.app`
- **Health Check**: `https://tu-backend.railway.app/api/health`

---

## 🆘 Solución de Problemas Comunes

### ❌ Error: "Failed to fetch" en el frontend
**Causa**: CORS o URL incorrecta
**Solución**: 
1. Verifica que `VITE_API_URL` en Vercel sea correcta
2. Verifica que `FRONTEND_URL` en Railway sea correcta
3. Espera 2-3 minutos para que los cambios se apliquen

### ❌ Error: "Database connection failed"
**Causa**: Variables de entorno incorrectas
**Solución**:
1. Verifica que Railway haya creado MySQL automáticamente
2. Las variables `DB_HOST`, `DB_USER`, etc. se configuran solas
3. Ejecuta `npm run db:init` en el terminal de Railway

### ❌ Error: "Build failed" en Vercel
**Causa**: Dependencias o configuración incorrecta
**Solución**:
1. Verifica que `package.json` tenga todas las dependencias
2. Revisa los logs de build en Vercel
3. Asegúrate de usar `npm ci` como install command

### ❌ Error: "Error al conectar a MySQL" en Railway
**Causa**: Variables de entorno de MySQL no configuradas o servicio MySQL no agregado
**Solución**:
1. **Verifica que MySQL esté agregado**:
   - Ve al dashboard de Railway
   - Debe haber un servicio "MySQL" además del backend
   - Si no existe, agrégalo: "New" → "Database" → "MySQL"

2. **Verifica las variables de entorno**:
   - Ve a tu servicio backend → "Variables"
   - Debe haber variables como `DB_HOST`, `DB_USER`, `DB_PASSWORD`
   - Si no existen, Railway las agregará automáticamente cuando agregues MySQL

3. **Reinicia el servicio**:
   - Haz clic en "Redeploy" en tu servicio backend
   - Esto aplicará las nuevas variables de entorno

4. **Verifica los logs**:
   - Ve a "Deployments" → "View Logs"
   - Busca mensajes como "Variables de entorno de MySQL no configuradas"
   - El script ahora muestra información de debug detallada

---

## 💡 Tips para tu Presentación

### ✅ Checklist Pre-Presentación
- [ ] Frontend carga correctamente
- [ ] Login funciona con credenciales admin
- [ ] Dashboard muestra datos
- [ ] Todas las secciones son accesibles
- [ ] URLs son fáciles de recordar/compartir

### 📱 Acceso Móvil
- La aplicación es responsive
- Funciona en tablets y móviles
- Usa las mismas URLs desplegadas

### 🔄 Actualizaciones Rápidas
Para hacer cambios después del despliegue:
1. Haz cambios en tu código local
2. `git add . && git commit -m "Update" && git push`
3. Vercel y Railway se actualizarán automáticamente

---

## 🎉 ¡Listo para Presentar!

Tu aplicación estará disponible 24/7 en las URLs desplegadas. Perfecta para demostraciones y presentaciones profesionales.

**Tiempo total de despliegue**: 15-20 minutos
**Costo**: $0 (completamente gratuito)
**Disponibilidad**: 99.9% uptime
