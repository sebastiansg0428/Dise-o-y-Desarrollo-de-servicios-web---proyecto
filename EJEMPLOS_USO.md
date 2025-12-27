# 🧪 Ejemplos de Uso - API Sistema de Gimnasio

## 📌 Endpoints Mejorados - Ejemplos con Postman/cURL

---

## 🏋️ ENTRENADORES

### 1. Crear Entrenador

```bash
POST http://localhost:3001/entrenadores
Content-Type: application/json

{
    "nombre": "Carlos",
    "apellido": "Fernández",
    "email": "carlos@gym.com",
    "telefono": "555-2001",
    "genero": "M",
    "fecha_nacimiento": "1990-05-15",
    "especialidad_principal": "hipertrofia",
    "experiencia_anios": 5,
    "certificaciones": "NSCA-CPT, ACE",
    "biografia": "Especialista en ganancia muscular",
    "tarifa_rutina": 25.00
}
```

**Respuesta exitosa**:

```json
{
  "success": true,
  "id": 4,
  "message": "Entrenador creado exitosamente"
}
```

### 2. Crear Horario (CON VALIDACIÓN)

```bash
POST http://localhost:3001/entrenadores/1/horarios
Content-Type: application/json

{
    "dia_semana": "lunes",
    "hora_inicio": "09:00:00",
    "hora_fin": "12:00:00",
    "disponible": 1
}
```

**Error si se solapa**:

```json
{
  "success": false,
  "message": "El horario se solapa con otro existente"
}
```

### 3. Crear Sesión de Entrenamiento (CON VALIDACIONES)

```bash
POST http://localhost:3001/entrenadores/1/sesiones
Content-Type: application/json

{
    "usuario_id": 1,
    "rutina_id": 1,
    "fecha": "2025-12-28 10:00:00",
    "duracion_minutos": 60,
    "tipo": "personal",
    "ubicacion": "gimnasio",
    "notas": "Primera sesión de evaluación"
}
```

**Validaciones aplicadas**:

- ✅ Entrenador existe y está activo
- ✅ Usuario existe y está activo
- ✅ No hay conflictos de horario

**Error si hay conflicto**:

```json
{
  "success": false,
  "message": "El entrenador ya tiene una sesión programada en ese horario"
}
```

### 4. Obtener Estadísticas de Entrenadores

```bash
GET http://localhost:3001/entrenadores/estadisticas
```

**Respuesta**:

```json
{
  "total_entrenadores": 3,
  "entrenadores_activos": 3,
  "tarifa_promedio": 20.17,
  "top_entrenadores": [
    {
      "id": 1,
      "nombre": "Luis",
      "apellido": "Pérez",
      "especialidad_principal": "fuerza",
      "promedio_puntuacion": 5.0,
      "total_clientes": 1
    }
  ]
}
```

---

## 🛒 PRODUCTOS Y VENTAS

### 5. Vender Producto (CON TRANSACCIÓN)

```bash
POST http://localhost:3001/productos/1/vender
Content-Type: application/json

{
    "cantidad": 2,
    "usuario_id": 1,
    "metodo_pago": "tarjeta"
}
```

**Respuesta exitosa**:

```json
{
  "success": true,
  "message": "Venta registrada: 2 x Proteína Whey 1kg",
  "total": 90.0,
  "stock_restante": 13
}
```

**Error si no hay stock**:

```json
{
  "success": false,
  "message": "Stock insuficiente. Disponible: 1"
}
```

**Ventajas de la transacción**:

- Si falla el registro de venta, no se descuenta el stock
- Si falla la actualización de stock, se revierte la venta
- Garantiza consistencia de datos

---

## 👤 USUARIOS

### 6. Registrar Usuario

```bash
POST http://localhost:3001/register
Content-Type: application/json

{
    "nombre": "Laura",
    "apellido": "González",
    "email": "laura@gmail.com",
    "password": "123456",
    "telefono": "555-0006",
    "fecha_nacimiento": "1995-03-20",
    "genero": "F",
    "membresia": "premium"
}
```

**⚠️ NOTA DE SEGURIDAD**: La contraseña se guarda en texto plano. Ver [MEJORAS_IMPLEMENTADAS.md](MEJORAS_IMPLEMENTADAS.md) para implementar bcrypt.

### 7. Login

```bash
POST http://localhost:3001/login
Content-Type: application/json

{
    "email": "laura@gmail.com",
    "password": "123456"
}
```

**Respuesta**:

```json
{
  "success": true,
  "user": {
    "id": 6,
    "nombre": "Laura",
    "apellido": "González",
    "email": "laura@gmail.com",
    "membresia": "premium",
    "estado": "activo",
    "fecha_vencimiento": "2026-01-26"
  }
}
```

---

## 💪 RUTINAS

### 8. Crear Rutina con Ejercicios

```bash
POST http://localhost:3001/rutinas
Content-Type: application/json

{
    "nombre": "Rutina Personalizada Push",
    "descripcion": "Entrenamiento de empuje para fuerza",
    "objetivo": "fuerza",
    "nivel": "intermedio",
    "duracion_estimada": 75,
    "frecuencia_semanal": 3,
    "tipo": "personalizada",
    "ejercicios": [
        {
            "ejercicio_id": 1,
            "orden": 1,
            "series": 5,
            "repeticiones": "5",
            "descanso": 180,
            "peso_sugerido": "80% 1RM",
            "notas": "Ejercicio principal"
        },
        {
            "ejercicio_id": 14,
            "orden": 2,
            "series": 4,
            "repeticiones": "8-10",
            "descanso": 120,
            "notas": "Segundo ejercicio compuesto"
        }
    ]
}
```

### 9. Asignar Rutina a Usuario

```bash
POST http://localhost:3001/usuarios/1/rutinas/1
Content-Type: application/json

{
    "fecha_inicio": "2025-12-27",
    "fecha_fin": "2026-03-27",
    "notas": "Rutina para ganar fuerza"
}
```

**Resultado**:

- Se asigna la rutina al usuario
- Se incrementa automáticamente la popularidad de la rutina

---

## 🗄️ CONSULTAS A LA BASE DE DATOS

### 10. Usar Vistas

```sql
-- Ver entrenadores con métricas completas
SELECT * FROM v_entrenadores_metricas WHERE estado = 'activo';

-- Productos con stock bajo
SELECT * FROM v_productos_inventario WHERE nivel_stock = 'stock_bajo';

-- Usuarios con membresía por vencer (próximos 7 días)
SELECT * FROM v_usuarios_membresia WHERE estado_membresia = 'por_vencer';

-- Top 10 rutinas más populares
SELECT * FROM v_rutinas_populares LIMIT 10;
```

### 11. Usar Procedimientos Almacenados

```sql
-- Renovar membresía de usuario por 3 meses
CALL sp_renovar_membresia(1, 3);

-- Ver disponibilidad de entrenador para mañana
CALL sp_disponibilidad_entrenador(1, '2025-12-27');

-- Obtener ingresos del mes actual
CALL sp_ingresos_mes(12, 2025);
```

### 12. Usar Funciones

```sql
-- Calcular edad de usuarios
SELECT nombre, fecha_nacimiento, fn_calcular_edad(fecha_nacimiento) as edad
FROM usuarios;

-- Descripción de membresías
SELECT nombre, membresia, fn_descripcion_membresia(membresia) as descripcion
FROM usuarios;
```

---

## 🧪 Pruebas de Validaciones

### Test 1: Intentar horario solapado

```bash
# Crear primer horario
POST http://localhost:3001/entrenadores/1/horarios
{
    "dia_semana": "lunes",
    "hora_inicio": "09:00:00",
    "hora_fin": "12:00:00"
}

# Intentar crear horario solapado (DEBE FALLAR)
POST http://localhost:3001/entrenadores/1/horarios
{
    "dia_semana": "lunes",
    "hora_inicio": "10:00:00",  # Se solapa con el anterior
    "hora_fin": "13:00:00"
}

# Resultado esperado: HTTP 409 - El horario se solapa con otro existente
```

### Test 2: Intentar vender sin stock suficiente

```bash
# Actualizar stock a 1
PUT http://localhost:3001/productos/1
{
    "stock": 1
}

# Intentar vender 5 (DEBE FALLAR)
POST http://localhost:3001/productos/1/vender
{
    "cantidad": 5,
    "usuario_id": 1
}

# Resultado esperado: HTTP 400 - Stock insuficiente. Disponible: 1
```

### Test 3: Sesión con conflicto de horario

```bash
# Crear primera sesión
POST http://localhost:3001/entrenadores/1/sesiones
{
    "usuario_id": 1,
    "fecha": "2025-12-28 10:00:00",
    "duracion_minutos": 60
}

# Intentar crear otra en horario solapado (DEBE FALLAR)
POST http://localhost:3001/entrenadores/1/sesiones
{
    "usuario_id": 2,
    "fecha": "2025-12-28 10:30:00",  # Se solapa con la anterior
    "duracion_minutos": 60
}

# Resultado esperado: HTTP 409 - El entrenador ya tiene una sesión programada
```

### Test 4: Triggers de validación

```sql
-- Intentar stock negativo (DEBE FALLAR)
UPDATE productos SET stock = -5 WHERE id = 1;
-- ERROR: El stock no puede ser negativo

-- Intentar sesión en el pasado (DEBE FALLAR)
INSERT INTO sesiones_entrenamiento (entrenador_id, usuario_id, fecha, estado)
VALUES (1, 1, '2020-01-01 10:00:00', 'programada');
-- ERROR: No se puede programar una sesión en el pasado
```

---

## 📊 Consultas Útiles para Reportes

### Ventas del día

```sql
SELECT
    v.id,
    p.nombre as producto,
    v.cantidad,
    v.precio_unitario,
    v.total,
    v.metodo_pago,
    u.nombre as comprador,
    DATE_FORMAT(v.created_at, '%H:%i') as hora
FROM ventas v
INNER JOIN productos p ON v.producto_id = p.id
LEFT JOIN usuarios u ON v.usuario_id = u.id
WHERE DATE(v.created_at) = CURDATE()
ORDER BY v.created_at DESC;
```

### Entrenadores más solicitados

```sql
SELECT
    e.nombre,
    e.apellido,
    e.especialidad_principal,
    COUNT(DISTINCT ec.usuario_id) as clientes,
    COUNT(DISTINCT s.id) as sesiones_totales,
    AVG(v.puntuacion) as puntuacion_promedio
FROM entrenadores e
LEFT JOIN entrenadores_clientes ec ON e.id = ec.entrenador_id
LEFT JOIN sesiones_entrenamiento s ON e.id = s.entrenador_id
LEFT JOIN valoraciones_entrenadores v ON e.id = v.entrenador_id
WHERE e.estado = 'activo'
GROUP BY e.id
ORDER BY clientes DESC, puntuacion_promedio DESC;
```

### Usuarios con membresía por vencer (próximos 7 días)

```sql
SELECT
    nombre,
    email,
    membresia,
    fecha_vencimiento,
    DATEDIFF(fecha_vencimiento, CURDATE()) as dias_restantes
FROM usuarios
WHERE estado = 'activo'
    AND fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY fecha_vencimiento;
```

### Productos con bajo stock

```sql
SELECT
    nombre,
    categoria,
    stock,
    stock_minimo,
    (stock_minimo - stock) as cantidad_comprar,
    (precio_compra * (stock_minimo - stock)) as inversion_necesaria
FROM productos
WHERE stock <= stock_minimo
    AND estado = 'activo'
ORDER BY stock ASC;
```

---

## 🔧 Configuración Inicial Recomendada

### 1. Aplicar mejoras de BD

```bash
mysql -u root -p meli < mejoras_bd.sql
```

### 2. Instalar dependencias

```bash
npm install
# Opcional: npm install bcrypt (para seguridad)
```

### 3. Iniciar servidor

```bash
node index.js
```

### 4. Probar endpoints

Usa Postman, Thunder Client o cURL con los ejemplos de arriba.

---

## 📝 Notas Importantes

1. **Transacciones**: Las ventas ahora son atómicas. Si algo falla, se revierte automáticamente.

2. **Validaciones**: Horarios, sesiones y stock se validan antes de guardar.

3. **Triggers**: La BD valida automáticamente reglas de negocio (stock negativo, fechas pasadas).

4. **Vistas**: Simplifican consultas complejas y mejoran rendimiento.

5. **Procedimientos**: Lógica de negocio centralizada en la BD.

---

## 🐛 Troubleshooting

### Error: "ER_DUP_ENTRY"

- Email duplicado al crear usuario/entrenador
- Solución: Usar email único

### Error: "El horario se solapa"

- Intentas crear horario en rango ocupado
- Solución: Elegir otro horario o modificar el existente

### Error: "Stock insuficiente"

- No hay suficiente producto para la venta
- Solución: Reducir cantidad o reabastecer

### Error: "El entrenador ya tiene una sesión programada"

- Conflicto de horario en sesiones
- Solución: Elegir otro horario

---

**Última actualización**: 26 de diciembre de 2025
