# 🚀 Guía de Despliegue - Control Flow Guard

Esta guía te ayudará a desplegar tu aplicación de forma gratuita para presentaciones.

## 📋 Opciones de Despliegue Gratuito

### 🎯 Recomendado para Presentaciones

**Frontend**: Vercel (gratuito, perfecto para React)
**Backend**: Railway (gratuito con límites generosos)
**Base de datos**: MySQL en Railway

## 🔧 Pasos para Desplegar

### 1. Preparar el Repositorio

```bash
# Asegúrate de que todo esté committeado
git add .
git commit -m "Preparar para despliegue"
git push origin main
```

### 2. Desplegar Backend en Railway

1. Ve a [Railway.app](https://railway.app) y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Selecciona el proyecto y la carpeta `backend`
4. Railway detectará automáticamente que es un proyecto Node.js
5. Configura las variables de entorno:

```env
NODE_ENV=production
JWT_SECRET=tu-secreto-jwt-super-seguro-aqui
FRONTEND_URL=https://tu-app.vercel.app
```

6. Railway creará automáticamente una base de datos MySQL
7. Usa las credenciales de la base de datos que Railway te proporcione:

```env
DB_HOST=containers-us-west-xxx.railway.app
DB_USER=root
DB_PASSWORD=tu-password-de-railway
DB_NAME=railway
DB_PORT=3306
```

### 3. Desplegar Frontend en Vercel

1. Ve a [Vercel.com](https://vercel.com) y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Configura el proyecto:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (raíz del proyecto)
   - **Build Command**: `npm ci && npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

4. Configura las variables de entorno:
```env
VITE_API_URL=https://tu-backend.railway.app
```

5. Haz clic en "Deploy"

**Nota**: El proyecto está configurado para usar npm en lugar de Bun para mayor compatibilidad.

### 4. Inicializar la Base de Datos

Una vez que Railway esté desplegado:

1. Ve a la consola de Railway
2. Abre el terminal de tu servicio
3. Ejecuta: `npm run db:init`

## 🔗 URLs de Acceso

- **Frontend**: `https://tu-app.vercel.app`
- **Backend API**: `https://tu-backend.railway.app`
- **Health Check**: `https://tu-backend.railway.app/api/health`

## 🔐 Credenciales Iniciales

- **Email**: `admin@essalud.gob.pe`
- **Password**: `admin123`

## 🛠️ Alternativas de Despliegue

### Opción 2: Todo en Railway
- Frontend y Backend en Railway
- Más simple pero menos optimizado para frontend

### Opción 3: Netlify + Railway
- Frontend en Netlify
- Backend en Railway
- Similar a Vercel pero con Netlify

## 📊 Monitoreo

- **Railway**: Dashboard con métricas de uso
- **Vercel**: Analytics y logs de despliegue
- **Health Check**: `/api/health` para verificar estado

## 🔄 Actualizaciones

Para actualizar la aplicación:

1. Haz cambios en tu código local
2. Commit y push a GitHub
3. Vercel y Railway se actualizarán automáticamente

## 🆘 Solución de Problemas

### Error de CORS
- Verifica que `FRONTEND_URL` esté configurado correctamente en Railway

### Error de Base de Datos
- Verifica las credenciales de MySQL en Railway
- Ejecuta `npm run db:init` en el terminal de Railway

### Error de Build
- Verifica que todas las dependencias estén en `package.json`
- Revisa los logs de build en Vercel/Railway

## 💡 Tips para Presentaciones

1. **Prueba todo antes**: Accede a la URL desplegada y verifica que funcione
2. **Ten un backup**: Mantén una copia local funcionando
3. **Credenciales listas**: Ten las credenciales de admin a mano
4. **URLs cortas**: Usa un acortador de URLs para facilitar el acceso

## 📱 Acceso Móvil

La aplicación es responsive y funcionará en dispositivos móviles usando las URLs desplegadas.

---

¡Tu aplicación estará lista para la presentación! 🎉
