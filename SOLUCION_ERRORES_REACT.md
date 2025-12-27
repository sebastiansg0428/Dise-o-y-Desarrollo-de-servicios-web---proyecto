# 🔧 Solución de Errores al Eliminar en React

## 🚨 Problema Identificado

El error que estabas viendo:

```
No se ejecutó 'removeChild' en 'Node': El nodo a eliminar no es hijo de este nodo.
```

**Este es un error del FRONTEND (React), NO del backend.**

### Causa del Error:

Este error ocurre cuando React intenta actualizar el DOM pero:

1. El elemento ya fue eliminado
2. Las keys de React no son únicas o están mal manejadas
3. El estado no se actualiza correctamente después de una eliminación
4. Hay re-renders mientras se procesa la eliminación

---

## ✅ Soluciones Aplicadas en el Backend

### 1. **Mejora de Endpoints DELETE**

Se mejoraron los 3 endpoints de eliminación:

#### a) DELETE Cliente del Entrenador

**Antes:**

```javascript
app.delete(
  "/entrenadores/:entrenador_id/clientes/:usuario_id",
  async (req, res) => {
    // Respuesta simple
    res.json({ success: true, message: "Cliente desasignado" });
  }
);
```

**Ahora:**

```javascript
app.delete(
  "/entrenadores/:entrenador_id/clientes/:usuario_id",
  async (req, res) => {
    // ✅ Verifica que existe antes de eliminar
    // ✅ Logs para debugging
    // ✅ Respuesta detallada con IDs
    res.status(200).json({
      success: true,
      message: "Cliente desasignado del entrenador correctamente",
      entrenador_id: parseInt(entrenador_id),
      usuario_id: parseInt(usuario_id),
      affectedRows: result.affectedRows,
    });
  }
);
```

#### b) DELETE Sesión

```javascript
app.delete("/sesiones/:id", async (req, res) => {
  // ✅ Verifica existencia
  // ✅ Log detallado
  // ✅ Respuesta con status 200 explícito
  res.status(200).json({
    success: true,
    message: "Sesión eliminada correctamente",
    id: parseInt(id),
    affectedRows: result.affectedRows,
  });
});
```

#### c) DELETE Valoración

```javascript
app.delete(
  "/entrenadores/:entrenador_id/valoraciones/:valoracion_id",
  async (req, res) => {
    // ✅ Verifica existencia
    // ✅ Log detallado
    // ✅ Respuesta completa
    res.status(200).json({
      success: true,
      message: "Valoración eliminada correctamente",
      entrenador_id: parseInt(entrenador_id),
      valoracion_id: parseInt(valoracion_id),
      affectedRows: result.affectedRows,
    });
  }
);
```

### 2. **Mejora de CORS**

**Antes:**

```javascript
app.use(cors());
```

**Ahora:**

```javascript
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors()); // Manejar preflight requests
```

### 3. **Logs para Debugging**

Cada endpoint DELETE ahora tiene logs:

```
[DELETE CLIENTE] Entrenador: 1, Usuario: 5
[DELETE CLIENTE] Eliminado correctamente. Filas afectadas: 1

[DELETE SESION] ID: 10
[DELETE SESION] Eliminada correctamente. Filas afectadas: 1

[DELETE VALORACION] Entrenador: 1, Valoracion: 3
[DELETE VALORACION] Eliminada correctamente. Filas afectadas: 1
```

---

## 🔍 Cómo Solucionar el Error en tu Frontend React

### Problema en React:

El error típicamente viene de código como este:

```javascript
// ❌ INCORRECTO - Causa el error
const eliminarCliente = async (usuarioId) => {
  await fetch(`${API}/entrenadores/${entrenadorId}/clientes/${usuarioId}`, {
    method: "DELETE",
  });

  // Si actualizas el estado antes de que React termine de procesar
  setClientes(clientes.filter((c) => c.usuario_id !== usuarioId));
};
```

### ✅ SOLUCIÓN CORRECTA:

```javascript
const eliminarCliente = async (usuarioId) => {
  try {
    const response = await fetch(
      `${API}/entrenadores/${entrenadorId}/clientes/${usuarioId}`,
      { method: "DELETE" }
    );

    const data = await response.json();

    if (data.success) {
      // ✅ Actualizar estado DESPUÉS de confirmar
      setClientes((prevClientes) =>
        prevClientes.filter((c) => c.usuario_id !== usuarioId)
      );

      // ✅ Mostrar mensaje
      toast.success("Cliente eliminado correctamente");
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    toast.error("Error al eliminar cliente");
  }
};
```

### Puntos Clave:

1. **Usar `prevState`** en `setState`:

   ```javascript
   setClientes((prevClientes) =>
     prevClientes.filter((c) => c.usuario_id !== usuarioId)
   );
   ```

2. **Verificar `data.success`** antes de actualizar:

   ```javascript
   if (data.success) {
       // Solo actualizar si el backend confirma éxito
       setClientes(...);
   }
   ```

3. **Keys únicas en React**:

   ```javascript
   {
     clientes.map((cliente) => (
       <div key={cliente.usuario_id}>
         {" "}
         {/* ✅ Key única */}
         {/* contenido */}
       </div>
     ));
   }
   ```

4. **Evitar múltiples re-renders durante eliminación**:

   ```javascript
   const [isDeleting, setIsDeleting] = useState(false);

   const eliminarCliente = async (usuarioId) => {
     if (isDeleting) return; // ✅ Prevenir múltiples clicks
     setIsDeleting(true);

     try {
       // ... lógica de eliminación
     } finally {
       setIsDeleting(false);
     }
   };
   ```

---

## 🧪 Probar las Correcciones

### 1. Verificar en Consola del Backend

Cuando elimines algo, deberías ver:

```
[DELETE CLIENTE] Entrenador: 1, Usuario: 5
[DELETE CLIENTE] Eliminado correctamente. Filas afectadas: 1
```

### 2. Verificar la Respuesta en Frontend

```javascript
console.log("Respuesta del servidor:", data);
// Debe mostrar:
// { success: true, message: '...', usuario_id: 5, affectedRows: 1 }
```

### 3. Verificar en Network Tab (F12)

- Status: **200 OK**
- Response: `{ "success": true, ... }`
- No debe haber errores CORS

---

## 📝 Resumen de Cambios

| Componente          | Antes            | Ahora                                        |
| ------------------- | ---------------- | -------------------------------------------- |
| DELETE Clientes     | Respuesta simple | ✅ Verificación + logs + respuesta detallada |
| DELETE Sesiones     | Respuesta simple | ✅ Verificación + logs + respuesta detallada |
| DELETE Valoraciones | Respuesta simple | ✅ Verificación + logs + respuesta detallada |
| CORS                | Básico           | ✅ Configurado para React (5173, 3000)       |
| Status HTTP         | 200/404/500      | ✅ Siempre 200 para éxito                    |
| Debugging           | Sin logs         | ✅ Logs detallados en consola                |

---

## 🚀 Siguiente Paso

**El backend ya está corregido.** Ahora necesitas actualizar tu código React:

1. Usa `prevState` en `setState`
2. Verifica `data.success` antes de actualizar
3. Usa keys únicas en listas
4. Previene múltiples eliminaciones simultáneas

### Ejemplo Completo para tu React:

```javascript
// EntrenadorClientes.jsx
const eliminarCliente = async (usuarioId) => {
  if (!confirm("¿Quitar este cliente del entrenador?")) return;

  try {
    const response = await fetch(
      `http://localhost:3001/entrenadores/${entrenadorId}/clientes/${usuarioId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      // ✅ Actualizar estado usando función
      setClientes((prevClientes) =>
        prevClientes.filter((c) => c.usuario_id !== usuarioId)
      );

      alert(data.message);
    } else {
      alert(data.message || "Error al eliminar");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error de conexión");
  }
};

// En el JSX
return (
  <div>
    {clientes.map((cliente) => (
      <div key={`cliente-${cliente.usuario_id}`}>
        {" "}
        {/* ✅ Key única */}
        <span>{cliente.usuario_nombre}</span>
        <button
          onClick={() => eliminarCliente(cliente.usuario_id)}
          disabled={isDeleting}
        >
          Eliminar
        </button>
      </div>
    ))}
  </div>
);
```

---

## ✅ Estado Actual

- ✅ Backend corregido y mejorado
- ✅ CORS configurado correctamente
- ✅ Logs de debugging agregados
- ✅ Respuestas HTTP estandarizadas
- ✅ Verificaciones antes de eliminar
- ⚠️ **Pendiente:** Actualizar código React (tu frontend)

**El servidor está listo. Ahora actualiza tu código React siguiendo los ejemplos de arriba.**
