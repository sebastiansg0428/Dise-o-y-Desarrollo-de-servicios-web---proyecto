# 📋 INSTRUCCIONES DE INSTALACIÓN RBAC - PASO A PASO

## ⚠️ IMPORTANTE: Sigue este orden exacto

### PASO 1: Limpiar tablas anteriores

1. Abre **phpMyAdmin**
2. Selecciona la base de datos **meli**
3. Ve a la pestaña **SQL**
4. Abre el archivo `PASO1_LIMPIAR.sql`
5. **COPIA TODO EL CONTENIDO** del archivo
6. **PEGA** en la ventana SQL de phpMyAdmin
7. Haz clic en **"Continuar"** o **"Go"**

✅ Deberías ver: "Query OK" sin errores

---

### PASO 2: Crear el sistema RBAC

1. Quédate en la pestaña **SQL** de phpMyAdmin
2. **BORRA** todo lo que hay en la ventana SQL
3. Abre el archivo `rbac_sistema_completo.sql`
4. **COPIA TODO EL CONTENIDO** del archivo
5. **PEGA** en la ventana SQL de phpMyAdmin
6. Haz clic en **"Continuar"** o **"Go"**

✅ Deberías ver múltiples "Query OK" (aproximadamente 100+ consultas exitosas)

---

### PASO 3: Asignar rol de administrador

1. Quédate en la pestaña **SQL** de phpMyAdmin
2. **BORRA** todo lo que hay en la ventana SQL
3. **COPIA Y PEGA** este comando:

```sql
CALL asignar_rol_usuario(1, 'admin', 1);
```

4. Haz clic en **"Continuar"** o **"Go"**

✅ Deberías ver: "Query OK" - Esto asigna el rol de administrador al usuario ID 1

---

### PASO 4: Verificar la instalación

Copia y ejecuta cada uno de estos comandos en phpMyAdmin (uno por uno):

```sql
-- Ver todos los roles creados (deberías ver 4)
SELECT * FROM roles;
```

```sql
-- Ver todos los permisos (deberías ver 47+)
SELECT COUNT(*) as total_permisos FROM permisos;
```

```sql
-- Ver tu rol de administrador
SELECT * FROM vista_usuarios_roles WHERE usuario_id = 1;
```

✅ Si todo está bien, continúa al siguiente paso

---

### PASO 5: Probar desde el backend

Abre tu terminal y ejecuta:

```bash
node test_rbac.js
```

✅ Deberías ver: "✅ Todos los 9 tests pasaron correctamente"

---

### PASO 6: Probar endpoints API

Usa Postman o curl para probar:

**1. Iniciar sesión** (obtener token JWT):

```http
POST http://localhost:3001/login
Content-Type: application/json

{
  "email": "tu_email@ejemplo.com",
  "contraseña": "tu_contraseña"
}
```

Copia el `token` que recibes en la respuesta.

**2. Ver tu información con roles**:

```http
GET http://localhost:3001/me
Authorization: Bearer TU_TOKEN_AQUI
```

Deberías ver tu información con:

- `rol`: "admin"
- `nivelRol`: 100
- `permisos`: ["usuarios:ver", "usuarios:crear", ...]

**3. Ver todos los roles**:

```http
GET http://localhost:3001/rbac/roles
Authorization: Bearer TU_TOKEN_AQUI
```

**4. Ver todos los permisos**:

```http
GET http://localhost:3001/rbac/permisos
Authorization: Bearer TU_TOKEN_AQUI
```

---

## 🎉 ¡INSTALACIÓN COMPLETA!

Si todos los pasos funcionaron, tu sistema RBAC está instalado y funcionando.

### Próximos pasos:

1. Lee `GUIA_RBAC_COMPLETA.md` para entender cómo usar el sistema
2. Lee `REACT_RBAC_GUIDE.md` para integrar RBAC en tu frontend React
3. Revisa `RESUMEN_RBAC.md` para un overview rápido

---

## ❌ Solución de problemas comunes

### Error: "Cannot delete or update parent row"

- **Solución**: Asegúrate de ejecutar PASO1_LIMPIAR.sql PRIMERO antes de rbac_sistema_completo.sql

### Error: "Table already exists"

- **Solución**: El sistema detecta tablas existentes. Ejecuta PASO1_LIMPIAR.sql de nuevo

### Error 401 al probar endpoints

- **Solución**: Asegúrate de incluir el header `Authorization: Bearer TU_TOKEN`

### Error: "Usuario no tiene rol asignado"

- **Solución**: Ejecuta el PASO 3 de nuevo: `CALL asignar_rol_usuario(1, 'admin', 1);`

---

## 📞 ¿Necesitas ayuda?

Revisa los siguientes archivos de documentación:

- `GUIA_RBAC_COMPLETA.md` - Tutorial completo
- `REACT_RBAC_GUIDE.md` - Integración con React
- `RBAC_REQUESTS_TESTING.md` - Ejemplos de peticiones HTTP
