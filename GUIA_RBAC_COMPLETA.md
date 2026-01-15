# 🔒 SISTEMA RBAC - GUÍA DE IMPLEMENTACIÓN Y USO

## 📚 Índice

1. [Instalación](#instalación)
2. [Roles Disponibles](#roles-disponibles)
3. [Permisos por Recurso](#permisos-por-recurso)
4. [Endpoints Disponibles](#endpoints-disponibles)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [Proteger Rutas](#proteger-rutas)
7. [Testing](#testing)

---

## 🚀 Instalación

### 1. Ejecutar el script SQL

```bash
# En MySQL o phpMyAdmin, ejecutar:
source rbac_sistema_completo.sql
```

Este script crea:

- ✅ Tablas: `roles`, `permisos`, `usuarios_roles`, `roles_permisos`
- ✅ 4 Roles básicos: admin, entrenador, cliente, recepcionista
- ✅ Permisos para todos los recursos
- ✅ Vistas y procedimientos almacenados
- ✅ Relaciones entre tablas

### 2. Reiniciar el servidor

```bash
node index.js
```

---

## 👥 Roles Disponibles

| Rol               | Nivel | Descripción           | Permisos                                 |
| ----------------- | ----- | --------------------- | ---------------------------------------- |
| **admin**         | 100   | Administrador total   | Todos los permisos                       |
| **entrenador**    | 50    | Entrenador personal   | Gestión de clientes, rutinas, ejercicios |
| **recepcionista** | 30    | Personal de recepción | Registro de usuarios, pagos, productos   |
| **cliente**       | 10    | Cliente del gimnasio  | Solo lectura de sus datos                |

---

## 🔑 Permisos por Recurso

### Usuarios

- `usuarios.listar` - Listar todos los usuarios
- `usuarios.ver` - Ver detalles de un usuario
- `usuarios.crear` - Crear nuevos usuarios
- `usuarios.editar` - Editar información
- `usuarios.eliminar` - Eliminar usuarios
- `usuarios.cambiar_estado` - Activar/desactivar

### Pagos

- `pagos.listar` - Ver todos los pagos
- `pagos.ver` - Ver detalles de un pago
- `pagos.crear` - Registrar nuevos pagos
- `pagos.editar` - Modificar pagos
- `pagos.eliminar` - Eliminar pagos
- `pagos.estadisticas` - Ver estadísticas

### Productos

- `productos.listar`, `productos.ver`, `productos.crear`
- `productos.editar`, `productos.eliminar`, `productos.vender`

### Rutinas

- `rutinas.listar`, `rutinas.ver`, `rutinas.crear`
- `rutinas.editar`, `rutinas.eliminar`, `rutinas.asignar`

### Entrenadores

- `entrenadores.listar`, `entrenadores.ver`, `entrenadores.crear`
- `entrenadores.editar`, `entrenadores.eliminar`
- `entrenadores.asignar_clientes`

### Dashboard & Reportes

- `dashboard.ver` - Ver dashboard principal
- `dashboard.estadisticas` - Ver estadísticas
- `reportes.ingresos`, `reportes.usuarios`, `reportes.general`

---

## 🌐 Endpoints Disponibles

### Gestión de Roles

```javascript
GET    /rbac/roles                          // Listar todos los roles
GET    /rbac/roles/:rolNombre/permisos      // Permisos de un rol
POST   /rbac/roles                          // Crear nuevo rol
```

### Gestión de Permisos

```javascript
GET    /rbac/permisos                       // Listar todos los permisos
POST   /rbac/permisos                       // Crear nuevo permiso
POST   /rbac/roles/:rolNombre/permisos      // Asignar permiso a rol
DELETE /rbac/roles/:rolNombre/permisos/:permisoNombre  // Revocar permiso
```

### Asignación de Roles a Usuarios

```javascript
GET    /rbac/usuarios/:id/roles             // Ver roles de un usuario
POST   /rbac/usuarios/:id/roles             // Asignar rol a usuario
DELETE /rbac/usuarios/:id/roles/:rolNombre  // Revocar rol
```

### Información del Usuario Actual

```javascript
GET / me; // Información completa + roles + permisos
```

### Estadísticas

```javascript
GET / rbac / estadisticas; // Estadísticas del sistema RBAC
```

---

## 💡 Ejemplos de Uso

### 1. Asignar rol de Admin a un usuario

```javascript
// Endpoint: POST /rbac/usuarios/1/roles
// Headers: Authorization: Bearer <tu_token_jwt>
// Body:
{
  "rol": "admin"
}

// Respuesta:
{
  "mensaje": "Rol asignado correctamente",
  "rolId": 1
}
```

### 2. Ver roles y permisos de un usuario

```javascript
// Endpoint: GET /rbac/usuarios/1/roles
// Headers: Authorization: Bearer <tu_token_jwt>

// Respuesta:
{
  "usuario_id": 1,
  "roles": [
    {
      "id": 1,
      "nombre": "admin",
      "descripcion": "Administrador del sistema",
      "nivel": 100,
      "fecha_asignacion": "2026-01-13T..."
    }
  ],
  "permisos": [
    {
      "nombre": "usuarios.listar",
      "recurso": "usuarios",
      "accion": "read",
      "descripcion": "Listar todos los usuarios"
    },
    // ... más permisos
  ]
}
```

### 3. Obtener información completa del usuario autenticado

```javascript
// Endpoint: GET /me
// Headers: Authorization: Bearer <tu_token_jwt>

// Respuesta:
{
  "id": 1,
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "admin@gym.com",
  "estado": "activo",
  "membresia": "premium",
  "roles": [
    {
      "nombre": "admin",
      "nivel": 100
    }
  ],
  "permisos": [
    { "nombre": "usuarios.listar", "recurso": "usuarios", "accion": "read" },
    // ... todos los permisos
  ]
}
```

### 4. Crear nuevo rol personalizado

```javascript
// Endpoint: POST /rbac/roles
// Headers: Authorization: Bearer <tu_token_admin>
// Body:
{
  "nombre": "nutricionista",
  "descripcion": "Nutricionista del gimnasio",
  "nivel": 40
}

// Respuesta:
{
  "mensaje": "Rol creado correctamente",
  "rolId": 5
}
```

### 5. Asignar permiso a un rol

```javascript
// Endpoint: POST /rbac/roles/nutricionista/permisos
// Body:
{
  "permiso": "usuarios.ver"
}

// Respuesta:
{
  "mensaje": "Permiso asignado al rol correctamente"
}
```

---

## 🛡️ Proteger Rutas con RBAC

### Importar middleware en index.js

```javascript
const rbacMiddleware = require("./middleware/rbac");
```

### Ejemplos de protección de rutas

#### 1. Solo Admin

```javascript
app.get(
  "/admin/panel",
  verificarToken,
  rbacMiddleware.esAdmin(),
  async (req, res) => {
    // Solo administradores pueden acceder
    res.json({ mensaje: "Panel de administración" });
  }
);
```

#### 2. Admin o Entrenador

```javascript
app.get(
  "/rutinas",
  verificarToken,
  rbacMiddleware.esAdminOEntrenador(),
  async (req, res) => {
    // Administradores y entrenadores pueden ver rutinas
  }
);
```

#### 3. Por Rol Específico

```javascript
app.post(
  "/productos",
  verificarToken,
  rbacMiddleware.verificarRol(["admin", "recepcionista"]),
  async (req, res) => {
    // Solo admin y recepcionista pueden crear productos
  }
);
```

#### 4. Por Permiso Específico

```javascript
app.post(
  "/pagos",
  verificarToken,
  rbacMiddleware.verificarPermiso("pagos.crear"),
  async (req, res) => {
    // Solo usuarios con permiso pagos.crear
  }
);
```

#### 5. Por Nivel Mínimo

```javascript
app.delete(
  "/usuarios/:id",
  verificarToken,
  rbacMiddleware.verificarNivel(50),
  async (req, res) => {
    // Solo usuarios con nivel 50 o superior (entrenador+)
  }
);
```

#### 6. Propio Dueño o Admin

```javascript
app.get(
  "/usuarios/:id",
  verificarToken,
  rbacMiddleware.esPropioDuenioOAdmin(),
  async (req, res) => {
    // Usuario puede ver sus propios datos, admin puede ver cualquiera
  }
);
```

---

## 🧪 Testing

### 1. Asignar rol de admin al primer usuario

```sql
-- En MySQL/phpMyAdmin:
CALL asignar_rol_usuario(1, 'admin', 1);
```

### 2. Verificar roles del usuario

```sql
SELECT * FROM vista_usuarios_roles WHERE usuario_id = 1;
```

### 3. Ver permisos de un usuario

```sql
CALL obtener_permisos_usuario(1);
```

### 4. Verificar si un usuario tiene permiso

```sql
SELECT usuario_tiene_permiso(1, 'usuarios.crear');
```

### 5. Testing desde JavaScript

```bash
node test_rbac.js
```

---

## 📊 Consultas SQL Útiles

### Ver todos los roles con cantidad de usuarios

```sql
SELECT * FROM vista_roles_estadisticas;
```

### Ver permisos por rol

```sql
SELECT * FROM vista_roles_permisos WHERE rol = 'entrenador';
```

### Usuarios sin rol asignado

```sql
SELECT u.id, u.nombre, u.apellido, u.email
FROM usuarios u
LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id AND ur.activo = 1
WHERE ur.id IS NULL;
```

### Roles más usados

```sql
SELECT
    r.nombre,
    COUNT(ur.usuario_id) as total_usuarios
FROM roles r
LEFT JOIN usuarios_roles ur ON r.id = ur.rol_id AND ur.activo = 1
GROUP BY r.id
ORDER BY total_usuarios DESC;
```

---

## 🔄 Flujo Recomendado

### 1. Instalación Inicial

```bash
# Ejecutar SQL
mysql -u root meli < rbac_sistema_completo.sql

# Asignar admin al primer usuario
mysql -u root meli -e "CALL asignar_rol_usuario(1, 'admin', 1);"

# Reiniciar servidor
node index.js
```

### 2. Login y obtener token

```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gym.com","password":"tu_password"}'
```

### 3. Usar el token en peticiones

```bash
curl http://localhost:3001/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 4. Asignar roles a otros usuarios

```bash
curl -X POST http://localhost:3001/rbac/usuarios/2/roles \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"rol":"entrenador"}'
```

---

## ⚠️ Notas Importantes

1. **Solo admins** pueden gestionar roles y permisos
2. **Múltiples roles**: Un usuario puede tener varios roles
3. **Nivel del usuario**: Se toma el nivel más alto de sus roles
4. **Permisos acumulativos**: Un usuario tiene todos los permisos de todos sus roles
5. **Autogestión**: Los usuarios pueden ver sus propios roles (endpoint /me)
6. **Token JWT**: Todos los endpoints RBAC requieren autenticación

---

## 🎯 Próximos Pasos

1. ✅ **Ejecutar el SQL**: `rbac_sistema_completo.sql`
2. ✅ **Asignar admin**: CALL asignar_rol_usuario(1, 'admin', 1);
3. ✅ **Reiniciar servidor**: node index.js
4. ✅ **Probar endpoints**: Usar Postman o curl
5. 🔄 **Proteger rutas**: Agregar middleware a endpoints sensibles
6. 🔄 **Frontend**: Mostrar/ocultar elementos según roles

---

## 📞 Soporte

Si necesitas ayuda:

- Revisa los ejemplos de uso
- Ejecuta las consultas SQL de prueba
- Verifica que el servidor muestre los nuevos endpoints
- Asegúrate de tener el token JWT en las peticiones

---

**Desarrollado con** ❤️ **para Reynal GYM**
