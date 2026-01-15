# 🚀 INSTALACIÓN RÁPIDA - SISTEMA RBAC

## ⚡ 3 Pasos para Instalar

### Paso 1: Ejecutar SQL en MySQL

```bash
# Opción A: Desde terminal MySQL
mysql -u root meli < rbac_sistema_completo.sql

# Opción B: En phpMyAdmin
# 1. Ir a la base de datos 'meli'
# 2. Click en "SQL"
# 3. Copiar y pegar el contenido de rbac_sistema_completo.sql
# 4. Click en "Continuar"
```

### Paso 2: Asignar Rol Admin

```sql
-- En MySQL o phpMyAdmin, ejecutar:
CALL asignar_rol_usuario(1, 'admin', 1);

-- Si tu usuario admin tiene otro ID, cambiar el primer número:
-- CALL asignar_rol_usuario(TU_ID_AQUI, 'admin', 1);
```

### Paso 3: Reiniciar Servidor

```bash
# Detener el servidor actual (Ctrl+C)
# Luego iniciar:
node index.js

# Deberías ver los endpoints RBAC listados al iniciar
```

---

## ✅ Verificación

### 1. Servidor Muestra Endpoints RBAC

Al iniciar el servidor deberías ver:

```
🔒 RBAC - ROLES Y PERMISOS:
  GET /rbac/roles - Listar todos los roles (solo admin)
  GET /rbac/permisos - Listar todos los permisos (solo admin)
  ...
```

### 2. Probar con Testing

```bash
node test_rbac.js
```

Deberías ver:

```
✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE
```

### 3. Verificar en Base de Datos

```sql
-- Ver roles creados
SELECT * FROM roles;

-- Ver permisos creados
SELECT COUNT(*) FROM permisos;

-- Ver rol asignado al usuario 1
SELECT * FROM vista_usuarios_roles WHERE usuario_id = 1;
```

---

## 🧪 Probar Endpoint con curl

### 1. Login y Obtener Token

```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"tu@email.com\",\"password\":\"tu_password\"}"
```

Respuesta:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### 2. Ver Tu Información con Roles

```bash
curl http://localhost:3001/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

Respuesta:

```json
{
  "id": 1,
  "nombre": "Admin",
  "email": "admin@gym.com",
  "roles": [
    {
      "nombre": "admin",
      "nivel": 100
    }
  ],
  "permisos": [
    { "nombre": "usuarios.listar", ... },
    ...
  ]
}
```

---

## 📁 Archivos Creados

```
ejemplo_backEnd/
├── rbac_sistema_completo.sql      ⭐ EJECUTAR PRIMERO
├── agregar_rol_usuarios.sql       (opcional)
├── INSTALAR_RBAC.sql              (script todo-en-uno)
├── middleware/
│   └── rbac.js                    ✅ Middleware protección
├── utils/
│   └── rbacDb.js                  ✅ Funciones helper
├── test_rbac.js                   🧪 Testing
├── GUIA_RBAC_COMPLETA.md          📖 Guía detallada
├── RESUMEN_RBAC.md                📝 Resumen ejecutivo
├── REACT_RBAC_GUIDE.md            ⚛️ Integración React
└── INSTALACION_RAPIDA.md          ⚡ Esta guía
```

---

## ❗ Problemas Comunes

### Error: "rbac is not defined"

**Solución:** Ejecutaste el servidor sin ejecutar el SQL primero

```bash
# Ejecutar el SQL y reiniciar el servidor
```

### Error: "Cannot read property 'id' of undefined"

**Solución:** No estás enviando el token JWT

```bash
# Agregar header Authorization: Bearer TOKEN
```

### No veo los endpoints RBAC

**Solución:** El archivo index.js no tiene las importaciones

```bash
# Verificar líneas 1-10 de index.js
# Deben estar:
# const rbacMiddleware = require('./middleware/rbac');
# const rbacDb = require('./utils/rbacDb');
```

### Error: ER_NO_SUCH_TABLE 'roles'

**Solución:** No se ejecutó el SQL correctamente

```bash
# Ejecutar de nuevo rbac_sistema_completo.sql
```

---

## 🎯 Próximos Pasos

1. ✅ Instalar RBAC (estos 3 pasos)
2. 📱 Implementar en frontend React (ver REACT_RBAC_GUIDE.md)
3. 🔒 Proteger rutas sensibles con middleware
4. 👥 Asignar roles a usuarios existentes
5. 🧪 Probar los permisos

---

## 📞 Recursos

- **Guía Completa:** [GUIA_RBAC_COMPLETA.md](GUIA_RBAC_COMPLETA.md)
- **Resumen:** [RESUMEN_RBAC.md](RESUMEN_RBAC.md)
- **React:** [REACT_RBAC_GUIDE.md](REACT_RBAC_GUIDE.md)

---

## 🎉 ¡Listo!

Tu sistema de gimnasio ahora tiene un control de acceso profesional basado en roles y permisos.

**Tiempo de instalación:** ~5 minutos ⏱️

---

_Desarrollado con ❤️ para Reynal GYM_
