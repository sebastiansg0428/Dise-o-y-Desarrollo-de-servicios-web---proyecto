# ACTUALIZACIÓN DE MEMBRESÍAS - RESUMEN COMPLETO

## 📋 Cambios Realizados

Se han actualizado las membresías del gimnasio para usar únicamente 5 tipos:

### ❌ Membresías ELIMINADAS:

- **basica** → Reemplazada por **semana**
- **premium** → Reemplazada por **mensualidad**
- **vip** → Reemplazada por **anual**

### ✅ Membresías NUEVAS (únicas disponibles):

1. **dia** - $4,000 COP - 1 día
2. **semana** - $30,000 COP - 7 días
3. **quincena** - $40,000 COP - 15 días
4. **mensualidad** - $60,000 COP - 30 días
5. **anual** - $600,000 COP - 365 días

---

## 📁 Archivos Modificados

### 1. **index.js** ✅ ACTUALIZADO

Se actualizaron los siguientes endpoints y funciones:

- ✅ `/register` - Registro de usuarios (líneas ~105-150)
- ✅ `/admin/clientes` - Creación de clientes por admin (líneas ~240-290)
- ✅ `PUT /usuarios/:id` - Actualización de usuarios (líneas ~418-430)
- ✅ `/stats` - Estadísticas del gimnasio (líneas ~535-552)
- ✅ `/renovar-membresia` - Renovación de membresía (líneas ~1853)

**Cambios aplicados:**

- Objeto `precios` simplificado (solo 5 membresías)
- Switch `membresiaLower` actualizado (sin alias)
- Array `tiposValidos` actualizado
- Query SQL de estadísticas actualizado

### 2. **public/registro_clientes.html** ✅ ACTUALIZADO

Interfaz web de registro de clientes:

**Cambios:**

- Select de membresías actualizado (2 formularios)
- Valores cambiados: `semanal` → `semana`, `quincenal` → `quincena`, `mensual` → `mensualidad`
- Opciones disponibles: dia, semana, quincena, mensualidad, anual

### 3. **actualizar_membresias_nuevas.sql** ✅ CREADO

Script SQL para actualizar la base de datos:

**Pasos que ejecuta:**

1. Convierte columna `membresia` de ENUM a VARCHAR temporalmente
2. Actualiza membresías existentes:
   - `basica` → `semana` ($30,000)
   - `premium` → `mensualidad` ($60,000)
   - `vip` → `anual` ($600,000)
3. Cambia columna a ENUM con los nuevos valores
4. Recalcula fechas de vencimiento según nueva membresía
5. Muestra reporte de verificación

### 3. **actualizar_procedimiento_membresias.sql** ✅ CREADO

Actualiza el procedimiento almacenado `sp_renovar_membresia_con_pago`:

**Cambios:**

- Parámetro `p_tipo_membresia` ahora acepta: dia, semana, quincena, mensualidad, anual
- Precios actualizados según las nuevas tarifas
- Días de membresía calculados correctamente
- Genera facturas con los nuevos tipos

---

## 🚀 INSTRUCCIONES DE IMPLEMENTACIÓN

### PASO 1: Actualizar la Base de Datos

Ejecuta los scripts SQL en phpMyAdmin en este orden:

```sql
-- 1. Actualizar estructura y datos de la tabla usuarios
source actualizar_membresias_nuevas.sql;

-- 2. Actualizar procedimiento almacenado
source actualizar_procedimiento_membresias.sql;
```

**O manualmente:**

1. Abre phpMyAdmin
2. Selecciona la base de datos `meli`
3. Ve a la pestaña "SQL"
4. Copia y pega el contenido de `actualizar_membresias_nuevas.sql`
5. Clic en "Continuar"
6. Repite con `actualizar_procedimiento_membresias.sql`

### PASO 2: Reiniciar el Servidor Node.js

```bash
# Detener el servidor actual (Ctrl+C si está corriendo)

# Iniciar de nuevo
node index.js
```

O si usas el archivo batch:

```bash
iniciar_servidor.bat
```

### PASO 3: Verificar los Cambios

#### En la Base de Datos:

```sql
-- Ver estructura actualizada
DESCRIBE usuarios;

-- Ver usuarios actualizados
SELECT id, nombre, membresia, precio_membresia,
       DATE_FORMAT(fecha_vencimiento, '%d/%m/%Y') as vencimiento
FROM usuarios;
```

#### En la Aplicación:

1. Intenta registrar un nuevo usuario con membresía "dia"
2. Intenta registrar con membresía "semana"
3. Verifica que las membresías antiguas (basica, premium, vip) ya NO funcionen
4. Revisa las estadísticas en `/stats`

---

## ⚠️ NOTAS IMPORTANTES

### Cambios Automáticos en Usuarios Existentes:

- Los usuarios con **basica** ahora tienen membresía **semana** (7 días)
- Los usuarios con **premium** ahora tienen membresía **mensualidad** (30 días)
- Los usuarios con **vip** ahora tienen membresía **anual** (365 días)
- Las fechas de vencimiento se recalculan automáticamente

### Comportamiento del Sistema:

- El valor por defecto es **dia** (si no se especifica membresía)
- Los precios están en **Pesos Colombianos (COP)**
- NO se aceptan alias (semanal, quincenal, mensual, diaria)
- Los nombres deben escribirse exactamente: dia, semana, quincena, mensualidad, anual

### Endpoints Actualizados:

```javascript
// Registro público
POST /register
Body: { ..., "membresia": "dia" } // solo: dia, semana, quincena, mensualidad, anual

// Crear cliente (admin)
POST /admin/clientes
Body: { ..., "membresia": "semana" }

// Actualizar usuario
PUT /usuarios/:id
Body: { "membresia": "mensualidad" }

// Renovar membresía
POST /renovar-membresia
Body: { "usuario_id": 1, "tipo_membresia": "anual" }
```

---

## 🔍 Validación Final

Verifica que:

- [ ] Los scripts SQL se ejecutaron sin errores
- [ ] La tabla `usuarios` tiene el ENUM actualizado
- [ ] Los usuarios existentes tienen las nuevas membresías
- [ ] El servidor Node.js inicia sin errores
- [ ] Puedes crear usuarios con las 5 nuevas membresías
- [ ] Las membresías antiguas (basica, premium, vip) ya NO funcionan
- [ ] Las estadísticas muestran las nuevas categorías
- [ ] El procedimiento almacenado funciona correctamente

---

## 📞 Soporte

Si encuentras algún error:

1. Revisa los logs del servidor Node.js
2. Verifica que la estructura de la tabla sea correcta con `DESCRIBE usuarios`
3. Asegúrate de que todos los scripts SQL se ejecutaron completamente
4. Verifica que no haya caracteres especiales en los nombres de membresías

---

**Fecha de actualización:** 10 de enero de 2026
**Versión:** 2.0 - Sistema de Membresías Simplificado
