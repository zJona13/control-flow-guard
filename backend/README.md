# Backend - Control Flow Guard API

API REST para el sistema de control interno del Hospital Luis Heysen.

## Instalación

```bash
npm install
```

## Configuración

Copiar `.env.example` a `.env` y configurar las variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=control_flow_guard
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
```

## Inicializar Base de Datos

```bash
npm run db:init
```

Este comando crea:
- La base de datos
- Todas las tablas necesarias
- Un usuario administrador (admin@essalud.gob.pe / admin123)

## Desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## Producción

```bash
npm start
```

## Estructura

```
backend/
├── config/           # Configuración (database.js)
├── controllers/      # Lógica de negocio
│   ├── authController.js
│   ├── excepcionesController.js
│   └── citasController.js
├── middleware/       # Middleware de autenticación
│   └── authMiddleware.js
├── routes/          # Definición de rutas
│   ├── auth.js
│   ├── excepciones.js
│   └── citas.js
├── scripts/         # Scripts de utilidad
│   └── initDb.js
├── server.js        # Punto de entrada
└── package.json
```

## API Endpoints

### Autenticación

```
POST   /api/auth/register    - Registrar usuario
POST   /api/auth/login       - Iniciar sesión
GET    /api/auth/profile     - Obtener perfil (requiere auth)
POST   /api/auth/logout      - Cerrar sesión (requiere auth)
```

### Excepciones

Todos los endpoints requieren autenticación.

```
GET    /api/excepciones                 - Listar excepciones
POST   /api/excepciones                 - Crear excepción (TI, CONTROL_INTERNO, ADMIN)
PATCH  /api/excepciones/:id             - Actualizar excepción
GET    /api/excepciones/estadisticas    - Obtener estadísticas (TI, CONTROL_INTERNO, ADMIN)
```

### Citas de Contingencia

Todos los endpoints requieren autenticación.

```
GET    /api/citas           - Listar citas (ADMISION, CLINICO, ADMIN)
GET    /api/citas/hoy       - Citas del día (ADMISION, CLINICO, ADMIN)
POST   /api/citas           - Crear cita (ADMISION, ADMIN)
PATCH  /api/citas/:id       - Actualizar estado (ADMISION, CLINICO, ADMIN)
GET    /api/citas/export    - Exportar CSV (ADMISION, ADMIN)
```

## Autenticación

El sistema usa JWT (JSON Web Tokens) para autenticación.

### Headers requeridos

```
Authorization: Bearer <token>
```

### Ejemplo de uso

```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { token, user } = await response.json();

// Usar token en peticiones subsecuentes
const data = await fetch('http://localhost:3001/api/excepciones', {
  headers: { 
    'Authorization': `Bearer ${token}` 
  }
});
```

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| ADMIN | Acceso completo |
| TI | Gestión de excepciones |
| CONTROL_INTERNO | Auditoría y control |
| ADMISION | Gestión de citas |
| CLINICO | Visualización de citas |

## Seguridad

- Contraseñas hasheadas con bcrypt (10 rounds)
- JWT firmado con secreto configurado
- Prepared statements para prevenir SQL injection
- Validación de inputs con express-validator
- CORS configurado para desarrollo

## Base de Datos

### Tablas principales

- `usuarios`: Usuarios del sistema
- `control_excepciones`: Registro de excepciones
- `excepcion_acciones`: Bitácora de acciones
- `citas_contingencia`: Citas de contingencia
- `ti_responsables`: Configuración de SLA
- `export_lotes`: Lotes de exportación
- `cita_exportacion`: Relación N:M

### Vistas

- `v_excepciones_abiertas`: Excepciones no cerradas
- `v_top5_fallas`: Top 5 tipos de fallas
- `v_excepciones_vencidas`: Excepciones fuera de SLA

### Triggers

- `trg_asigna_responsable_excepcion`: Asignación automática de responsable y fecha límite

## Errores Comunes

### Error de conexión MySQL

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solución**: Verificar que MySQL esté corriendo en Laragon.

### Base de datos no existe

```
Error: Unknown database 'control_flow_guard'
```

**Solución**: Ejecutar `npm run db:init`

### Token inválido

```
{"error": "Token inválido o expirado"}
```

**Solución**: Renovar token iniciando sesión nuevamente.

## Logs

El servidor muestra logs detallados en modo desarrollo:

```
[2024-10-22T10:30:00.000Z] - GET /api/excepciones
✓ Conexión a MySQL exitosa
```

## Testing

Para probar la API se puede usar:

- Postman
- Insomnia
- Thunder Client (VSCode)
- curl

Ejemplo con curl:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@essalud.gob.pe","password":"admin123"}'

# Obtener excepciones (usar token del login)
curl http://localhost:3001/api/excepciones \
  -H "Authorization: Bearer <token>"
```

## Contribuir

1. Crear rama feature
2. Implementar cambios
3. Ejecutar linter (si está configurado)
4. Crear pull request

