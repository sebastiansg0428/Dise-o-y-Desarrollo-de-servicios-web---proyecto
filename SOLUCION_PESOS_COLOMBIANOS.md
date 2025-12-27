# ✅ SOLUCIÓN: Pesos Colombianos

## 🎯 Problema Original

**Ingresabas**: 5.000 COP  
**Se mostraba**: $50

---

## 🔧 Cambios Realizados

### 1️⃣ **Backend (index.js)**

Los endpoints ahora devuelven la tarifa como **número entero** (sin decimales):

```javascript
// Antes:
SELECT e.tarifa_rutina  // Devolvía: "5000.00"

// Ahora:
SELECT CAST(e.tarifa_rutina AS UNSIGNED) as tarifa_rutina  // Devuelve: 5000
```

**Endpoints actualizados:**

- ✅ `GET /entrenadores`
- ✅ `GET /entrenadores/:id`
- ✅ `POST /entrenadores`

---

### 2️⃣ **Utilidades JavaScript (utils-pesos-colombianos.js)**

Nuevas funciones para formatear valores:

```javascript
// Formatear para mostrar
formatearPesosColombianos(5000)  // → "$5.000"
formatearPesosColombianos(10000) // → "$10.000"
formatearPesosColombianos(50000) // → "$50.000"

// Parsear para enviar al backend
parsearPesosColombianos("5.000")  // → 5000
parsearPesosColombianos("$10.000") // → 10000

// Formatear input mientras escribe
<input onkeyup="formatearInputPesos(event)" />
```

---

### 3️⃣ **Frontend (test_entrenadores.html)**

#### **Input con formato automático:**

```html
<input
  type="text"
  id="tarifa"
  value="5.000"
  onkeyup="formatearInputPesos(event)"
  placeholder="Ej: 5.000, 10.000, 50.000"
/>
```

#### **Enviar al backend:**

```javascript
const tarifaInput = document.getElementById("tarifa").value; // "5.000"
const tarifaNumerica = parsearPesosColombianos(tarifaInput); // 5000

fetch("/entrenadores", {
  body: JSON.stringify({
    tarifa_rutina: tarifaNumerica, // ✅ Enviar como número
  }),
});
```

#### **Mostrar en tabla:**

```javascript
entrenadores.forEach((e) => {
  const tarifa = formatearPesosColombianos(e.tarifa_rutina);
  // Muestra: "$5.000", "$10.000", etc.
});
```

---

## 🧪 Cómo Probar

### Opción 1: Página de Prueba

```
http://localhost:3001/test_entrenadores.html
```

1. Ingresa tarifa: `5.000` (se formatea automáticamente)
2. Crear entrenador
3. Verifica en la tabla: debe mostrar `$5.000`

### Opción 2: API Directa con cURL

```bash
curl -X POST http://localhost:3001/entrenadores \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "TEST",
    "apellido": "TARIFA",
    "email": "test.tarifa@gmail.com",
    "tarifa_rutina": 5000
  }'
```

**Response esperado:**

```json
{
  "success": true,
  "entrenador": {
    "tarifa_rutina": 5000 // ✅ Número sin decimales
  }
}
```

---

## 💻 Integrar en Tu Frontend

### React Example:

```jsx
import {
  formatearPesosColombianos,
  parsearPesosColombianos,
} from "./utils-pesos-colombianos";

function CrearEntrenador() {
  const [tarifa, setTarifa] = useState("");

  const handleSubmit = async () => {
    const tarifaNumerica = parsearPesosColombianos(tarifa);

    await fetch("/entrenadores", {
      method: "POST",
      body: JSON.stringify({
        tarifa_rutina: tarifaNumerica,
      }),
    });
  };

  return (
    <input
      value={tarifa}
      onChange={(e) => setTarifa(e.target.value)}
      onKeyUp={formatearInputPesos}
      placeholder="Ej: 5.000"
    />
  );
}

// Mostrar en tabla
function TablaEntrenadores({ entrenadores }) {
  return (
    <table>
      {entrenadores.map((e) => (
        <tr key={e.id}>
          <td>{formatearPesosColombianos(e.tarifa_rutina)}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Vue Example:

```vue
<template>
  <input
    v-model="tarifa"
    @keyup="formatearInputPesos"
    placeholder="Ej: 5.000"
  />

  <table>
    <tr v-for="e in entrenadores" :key="e.id">
      <td>{{ formatearPesos(e.tarifa_rutina) }}</td>
    </tr>
  </table>
</template>

<script>
import {
  formatearPesosColombianos,
  parsearPesosColombianos,
  formatearInputPesos,
} from "./utils-pesos-colombianos";

export default {
  methods: {
    formatearPesos(valor) {
      return formatearPesosColombianos(valor);
    },
    formatearInputPesos,
    async guardarEntrenador() {
      const tarifaNumerica = parsearPesosColombianos(this.tarifa);
      await this.$http.post("/entrenadores", {
        tarifa_rutina: tarifaNumerica,
      });
    },
  },
};
</script>
```

### Vanilla JavaScript:

```javascript
// Cargar script
<script src="/utils-pesos-colombianos.js"></script>;

// En tu código
document
  .getElementById("tarifa")
  .addEventListener("keyup", formatearInputPesos);

// Al enviar
const tarifaInput = document.getElementById("tarifa").value;
const tarifaNumerica = parsearPesosColombianos(tarifaInput);

// Al mostrar
entrenadores.forEach((e) => {
  const tarifaFormateada = formatearPesosColombianos(e.tarifa_rutina);
  // Mostrar: tarifaFormateada
});
```

---

## 📊 Ejemplos de Valores

| Ingresas    | Se guarda  | Backend devuelve | Frontend muestra |
| ----------- | ---------- | ---------------- | ---------------- |
| `5.000`     | 5000.00    | 5000             | `$5.000`         |
| `10.000`    | 10000.00   | 10000            | `$10.000`        |
| `50.000`    | 50000.00   | 50000            | `$50.000`        |
| `100.000`   | 100000.00  | 100000           | `$100.000`       |
| `1.000.000` | 1000000.00 | 1000000          | `$1.000.000`     |

---

## 🎨 Personalizar Formato

Si necesitas cambiar el formato:

```javascript
// Formato actual: $5.000
formatearPesosColombianos(5000); // "$5.000"

// Para cambiar el símbolo o formato:
function formatearPersonalizado(valor) {
  const numero = parseInt(valor);
  return "COP " + numero.toLocaleString("es-CO");
  // Resultado: "COP 5.000"
}

// O sin símbolo:
function soloNumeroFormateado(valor) {
  const numero = parseInt(valor);
  return numero.toLocaleString("es-CO");
  // Resultado: "5.000"
}
```

---

## ✅ Resumen

**ANTES:**

- ❌ Ingresabas 5000 → Mostraba $50
- ❌ Problema con decimales .00

**AHORA:**

- ✅ Ingresas 5.000 (con formato)
- ✅ Se envía 5000 (número entero)
- ✅ Se guarda 5000.00 en BD
- ✅ Backend devuelve 5000
- ✅ Frontend muestra $5.000

**Tu lógica actual NO se daña**, solo mejora con:

1. Backend devuelve números enteros
2. Frontend usa funciones de formateo
3. Input formatea automáticamente mientras escribes

---

## 📁 Archivos Creados/Modificados

✅ **index.js** - Endpoints actualizados  
✅ **utils-pesos-colombianos.js** - Utilidades de formateo  
✅ **test_entrenadores.html** - Ejemplo funcionando  
✅ **SOLUCION_PESOS_COLOMBIANOS.md** - Esta documentación

---

**¡Listo para usar!** 🎉

Abre: http://localhost:3001/test_entrenadores.html
