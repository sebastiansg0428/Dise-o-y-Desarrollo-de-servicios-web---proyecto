# 📝 Sistema de Registro de Clientes - Gimnasio

## 🎯 Descripción

Sistema mejorado de registro que funciona tanto para **autoregistro público** como para **creación de clientes por administradores**.

---

## 🔐 1. Autoregistro de Usuario (Público)

**Endpoint:** `POST /register`

**Descripción:** Permite que cualquier persona se registre en el gimnasio. Requiere contraseña obligatoriamente.

### Campos Requeridos ✅

```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan.perez@gmail.com",
  "password": "miPassword123",
  "telefono": "555-0001",
  "genero": "M"
}
```

### Campos Opcionales 🔹

```json
{
  "fecha_nacimiento": "1995-05-15",
  "membresia": "mensual",
  "direccion": "Calle 123 #45-67",
  "contacto_emergencia": "María Pérez",
  "contacto_emergencia_telefono": "555-0002",
  "objetivo_fitness": "Pérdida de peso",
  "condiciones_medicas": "Ninguna",
  "notas": "Primera vez en gimnasio"
}
```

### Tipos de Membresía 💳

- `dia` - $4,000 (1 día)
- `semanal` - $30,000 (7 días)
- `quincenal` - $40,000 (15 días)
- `mensual` - $60,000 (1 mes)
- `anual` - $600,000 (1 año)

### Ejemplo Completo

```javascript
const registro = await fetch("http://localhost:3001/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nombre: "Juan",
    apellido: "Pérez",
    email: "juan.perez@gmail.com",
    password: "segura123",
    telefono: "555-0001",
    fecha_nacimiento: "1995-05-15",
    genero: "M",
    membresia: "mensual",
    objetivo_fitness: "Ganar masa muscular",
  }),
});

const data = await registro.json();
```

### Respuesta Exitosa ✅

```json
{
  "success": true,
  "id": 10,
  "message": "¡Bienvenido! Usuario registrado exitosamente",
  "user": {
    "id": 10,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan.perez@gmail.com",
    "telefono": "555-0001",
    "genero": "M",
    "fecha_nacimiento": "1995-05-15",
    "membresia": "mensual",
    "estado": "activo",
    "precio_membresia": 60000,
    "fecha_vencimiento": "28/01/2026"
  }
}
```

### Validaciones 🛡️

- ✅ Nombre, apellido, email, password y teléfono son obligatorios
- ✅ Género debe ser: `M`, `F` o `Otro`
- ✅ Email debe tener formato válido
- ✅ Password mínimo 6 caracteres
- ✅ Email no puede estar duplicado

---

## 👨‍💼 2. Crear Cliente por Admin

**Endpoint:** `POST /admin/clientes`

**Descripción:** Permite a los administradores crear clientes. El password es opcional (se genera automáticamente si no se proporciona).

### Campos Requeridos ✅

```json
{
  "nombre": "Ana",
  "apellido": "García",
  "email": "ana.garcia@gmail.com",
  "telefono": "555-0003",
  "genero": "F"
}
```

### Campos Opcionales 🔹

```json
{
  "password": "opcional123",
  "fecha_nacimiento": "1998-08-20",
  "membresia": "anual",
  "direccion": "Av. Principal #789",
  "contacto_emergencia": "Pedro García",
  "contacto_emergencia_telefono": "555-0004",
  "objetivo_fitness": "Tonificación",
  "condiciones_medicas": "Asma leve",
  "notas": "Cliente VIP",
  "estado": "activo"
}
```

### Ejemplo Completo

```javascript
const nuevoCliente = await fetch("http://localhost:3001/admin/clientes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nombre: "Ana",
    apellido: "García",
    email: "ana.garcia@gmail.com",
    telefono: "555-0003",
    fecha_nacimiento: "1998-08-20",
    genero: "F",
    membresia: "anual",
    estado: "activo",
  }),
});

const data = await nuevoCliente.json();
```

### Respuesta Exitosa ✅

```json
{
  "success": true,
  "id": 11,
  "message": "Cliente creado exitosamente",
  "cliente": {
    "id": 11,
    "nombre": "Ana",
    "apellido": "García",
    "email": "ana.garcia@gmail.com",
    "telefono": "555-0003",
    "genero": "F",
    "fecha_nacimiento": "1998-08-20",
    "membresia": "anual",
    "estado": "activo",
    "precio_membresia": 600000,
    "total_visitas": 0,
    "fecha_vencimiento": "28/12/2026",
    "fecha_registro": "28/12/2025"
  },
  "password_temporal": "Gym8a7d9f2x"
}
```

**Nota:** Si no proporcionas password, el sistema genera uno temporal que se devuelve en `password_temporal`.

---

## 🔄 Diferencias entre Endpoints

| Característica       | `/register`                 | `/admin/clientes`        |
| -------------------- | --------------------------- | ------------------------ |
| **Uso**              | Público (autoregistro)      | Solo administradores     |
| **Password**         | ✅ Obligatorio              | ⚠️ Opcional (autogenera) |
| **Estado**           | Siempre "activo"            | ✅ Configurable          |
| **Fecha visita**     | Se registra automáticamente | No se registra           |
| **Retorna password** | ❌ No                       | ✅ Si fue autogenerado   |

---

## 🧪 Pruebas con cURL

### Autoregistro:

```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Carlos",
    "apellido": "Ruiz",
    "email": "carlos.ruiz@gmail.com",
    "password": "carlos123",
    "telefono": "555-0005",
    "genero": "M",
    "membresia": "semanal"
  }'
```

### Crear Cliente (Admin):

```bash
curl -X POST http://localhost:3001/admin/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Laura",
    "apellido": "Martínez",
    "email": "laura.martinez@gmail.com",
    "telefono": "555-0006",
    "genero": "F",
    "membresia": "quincenal",
    "fecha_nacimiento": "2000-03-10"
  }'
```

---

## ⚠️ Errores Comunes

### Error 400 - Campos faltantes

```json
{
  "success": false,
  "message": "Nombre, email y password son requeridos"
}
```

### Error 409 - Email duplicado

```json
{
  "success": false,
  "message": "El email ya existe"
}
```

### Error 400 - Género inválido

```json
{
  "success": false,
  "message": "Género inválido (opciones: M, F, Otro)"
}
```

### Error 400 - Password corto

```json
{
  "success": false,
  "message": "La contraseña debe tener al menos 6 caracteres"
}
```

---

## 💡 Recomendaciones

1. **Seguridad:** En producción, implementa bcrypt para hashear passwords
2. **Validación:** El email se valida con regex básico
3. **Membresía:** Por defecto es "dia" si no se especifica
4. **Estado:** Los nuevos usuarios siempre quedan "activo"
5. **Admin:** Considera agregar middleware de autenticación para `/admin/clientes`

---

## 🔧 Mejoras Implementadas

✅ Validación completa de campos obligatorios  
✅ Cálculo automático de precio según membresía  
✅ Cálculo correcto de fecha de vencimiento según tipo  
✅ Validación de formato de email  
✅ Validación de longitud de password  
✅ Generación automática de password temporal para admin  
✅ Mensajes de error descriptivos  
✅ Respuesta con datos completos del usuario creado  
✅ Sin contraseña en respuestas por seguridad

---

## 📞 Contacto

Para más información, consulta el archivo `EJEMPLOS_USO.md` o el código en `index.js`.
