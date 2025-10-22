# Control Flow Guard - Sistema de Control Interno

Sistema de gestión de excepciones de control interno y registro de citas de contingencia para el Hospital Luis Heysen de EsSalud.

## 🚀 Características

- **Gestión de Excepciones de Control (MEA02)**
  - Registro y seguimiento de excepciones
  - Asignación automática de responsables por SLA
  - Bitácora de acciones correctivas
  - Dashboard con métricas clave

- **Módulo de Contingencia (DSS04)**
  - Registro de citas cuando el sistema principal está caído
  - Exportación de datos para sincronización posterior
  - Vista de citas del día para personal clínico

- **Autenticación y Autorización**
  - Sistema basado en JWT
  - Control de acceso por roles
  - Sesiones seguras

## 📋 Requisitos

- Laragon con MySQL
- Node.js v18+
- npm o yarn

## 🛠️ Instalación Rápida

### 1. Iniciar MySQL en Laragon

```bash
# Abrir Laragon e iniciar los servicios
```

### 2. Instalar y configurar el backend

```bash
cd backend
npm install
npm run db:init
npm run dev
```

### 3. Instalar y configurar el frontend

```bash
npm install
npm run dev
```

### 4. Acceder al sistema

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

**Credenciales iniciales:**
- Email: `admin@essalud.gob.pe`
- Password: `admin123`

## 📖 Documentación Completa

Ver [INSTALLATION.md](./INSTALLATION.md) para guía detallada de instalación y configuración.

## 🏗️ Arquitectura

### Frontend
- React 18 con TypeScript
- Vite como bundler
- Tailwind CSS + shadcn/ui
- React Router para navegación
- Axios para peticiones HTTP

### Backend
- Node.js con Express
- MySQL como base de datos
- JWT para autenticación
- bcrypt para hash de contraseñas

## 📁 Estructura del Proyecto

```
control-flow-guard/
├── backend/              # Backend API
│   ├── config/          # Configuración
│   ├── controllers/     # Controladores
│   ├── middleware/      # Middleware
│   ├── routes/         # Rutas
│   └── server.js       # Servidor
├── src/                 # Frontend
│   ├── components/     # Componentes React
│   ├── hooks/         # Custom hooks
│   ├── pages/         # Páginas
│   ├── services/      # API client
│   └── main.tsx       # Entrada
└── sql/                # Scripts SQL
    └── mysql_schema.sql
```

## 🔐 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Acceso completo a todas las funcionalidades |
| **TI** | Gestión de excepciones técnicas |
| **CONTROL_INTERNO** | Auditoría y revisión de controles |
| **ADMISION** | Gestión de citas de contingencia |
| **CLINICO** | Visualización y atención de citas |

## 🔧 Configuración

### Variables de Entorno - Backend

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=control_flow_guard
JWT_SECRET=<tu-secreto-jwt>
JWT_EXPIRES_IN=7d
PORT=3001
```

### Variables de Entorno - Frontend

```env
VITE_API_URL=http://localhost:3001
```

## 📊 Base de Datos

El esquema incluye:

- **usuarios**: Usuarios del sistema con roles
- **control_excepciones**: Registro de excepciones
- **excepcion_acciones**: Bitácora de acciones correctivas
- **citas_contingencia**: Citas registradas en modo contingencia
- **ti_responsables**: Asignación de responsables por categoría

## 🚦 Scripts Disponibles

### Frontend
```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run preview      # Preview build
npm run lint         # Linter
```

### Backend
```bash
npm run dev          # Desarrollo con hot reload
npm start            # Producción
npm run db:init      # Inicializar BD
```

## 🔄 Migración desde Supabase

Este proyecto fue migrado de Supabase a MySQL local. Principales cambios:

- ✅ Autenticación JWT propia
- ✅ API REST con Express
- ✅ MySQL en lugar de PostgreSQL
- ✅ RLS implementado en backend
- ✅ Eliminadas dependencias de Supabase

## 📝 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Perfil
- `POST /api/auth/logout` - Logout

### Excepciones
- `GET /api/excepciones` - Listar
- `POST /api/excepciones` - Crear
- `PATCH /api/excepciones/:id` - Actualizar
- `GET /api/excepciones/estadisticas` - Stats

### Citas
- `GET /api/citas` - Listar
- `POST /api/citas` - Crear
- `PATCH /api/citas/:id` - Actualizar
- `GET /api/citas/export` - Exportar CSV

## 🛡️ Seguridad

- Contraseñas hasheadas con bcrypt
- JWT para autenticación stateless
- Control de acceso basado en roles
- Validación de inputs con express-validator
- Prepared statements para prevenir SQL injection

## 🐛 Solución de Problemas

### MySQL no conecta
```bash
# Verificar que MySQL esté corriendo en Laragon
# Verificar credenciales en backend/.env
```

### Error de token
```bash
# Limpiar localStorage y volver a iniciar sesión
```

### Puerto en uso
```bash
# Cambiar PORT en backend/.env
# Cambiar puerto en vite.config.ts
```

## 📄 Licencia

Este proyecto es privado y está destinado exclusivamente para uso interno del Hospital Luis Heysen de EsSalud.

## 🤝 Contribuir

1. Crear rama feature
2. Realizar cambios
3. Crear pull request
4. Esperar revisión

## 📞 Contacto

Para soporte técnico o consultas, contactar al equipo de TI del hospital.
