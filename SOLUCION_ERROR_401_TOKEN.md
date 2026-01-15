# 🔒 SOLUCIÓN: Error 401 (Unauthorized)

## 🔴 Problema

Tu aplicación React está recibiendo errores **401 (Unauthorized)** al intentar acceder a `/usuarios` porque:

1. El token JWT no se está enviando correctamente en las peticiones
2. El token puede haber expirado
3. El header `Authorization` no está configurado correctamente

## ✅ Cambios Realizados en el Backend

### 1. Protegida ruta de estadísticas

```javascript
// ✅ ANTES: Sin protección
app.get('/usuarios/estadisticas', async (req, res) => { ... }

// ✅ AHORA: Protegida con JWT
app.get('/usuarios/estadisticas', verificarToken, async (req, res) => { ... }
```

### 2. Agregado endpoint de verificación de token

```javascript
// Nuevo endpoint para verificar si el token es válido
app.get("/api/verify-token", verificarToken, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: req.usuario,
  });
});
```

## 🔧 Soluciones para el Frontend React

### Opción 1: Configuración de Axios (Recomendado)

Crea o modifica el archivo `src/services/api.js`:

```javascript
import axios from "axios";

const API_URL = "http://localhost:3001";

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        "🔑 Token agregado a la petición:",
        token.substring(0, 20) + "..."
      );
    } else {
      console.warn("⚠️ No hay token en localStorage");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("🔒 Token inválido o expirado. Redirigiendo a login...");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Uso en componentes:**

```javascript
import api from "./services/api";

// En lugar de axios.get o fetch
const response = await api.get("/usuarios");
const data = response.data;
```

### Opción 2: Función Helper para Fetch

```javascript
// src/utils/fetchWithAuth.js
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`http://localhost:3001${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("No autorizado");
  }

  return response;
};

// Uso:
const response = await fetchWithAuth("/usuarios");
const data = await response.json();
```

### Opción 3: Modificar ClientesTab.jsx Directamente

Busca donde haces las peticiones y modifica:

```javascript
// ❌ ANTES: Sin token
const response = await fetch("http://localhost:3001/usuarios");

// ✅ AHORA: Con token
const token = localStorage.getItem("token");
const response = await fetch("http://localhost:3001/usuarios", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

### Opción 4: Context API para Auth

```javascript
// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  // Configurar axios con el token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Verificar token al cargar
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/api/verify-token"
      );
      setUser(response.data.user);
    } catch (error) {
      console.error("Token inválido");
      logout();
    }
  };

  const login = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Uso en App.jsx:**

```javascript
import { AuthProvider } from "./context/AuthContext";

function App() {
  return <AuthProvider>{/* Tu aplicación */}</AuthProvider>;
}
```

**Uso en componentes:**

```javascript
import { useAuth } from "./context/AuthContext";

function ClientesTab() {
  const { token } = useAuth();

  const cargarUsuarios = async () => {
    // El token ya está configurado en axios
    const response = await axios.get("http://localhost:3001/usuarios");
  };
}
```

## 🔍 Verificar que el Login Guarde el Token

En tu componente de Login, verifica:

```javascript
// Login.jsx
const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:3001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success && data.token) {
      // ✅ IMPORTANTE: Guardar el token
      localStorage.setItem("token", data.token);
      console.log("✅ Token guardado:", data.token.substring(0, 20) + "...");

      // Redirigir al dashboard
      navigate("/dashboard");
    }
  } catch (error) {
    console.error("Error en login:", error);
  }
};
```

## 🧪 Pruebas

### 1. Verificar que el token se guarda en el login

Abre DevTools → Application → Local Storage → Busca "token"

### 2. Verificar que el token se envía en las peticiones

Abre DevTools → Network → Selecciona una petición → Headers → Request Headers → Busca "Authorization: Bearer ..."

### 3. Probar endpoint de verificación

```javascript
// En la consola del navegador
const token = localStorage.getItem("token");
fetch("http://localhost:3001/api/verify-token", {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((res) => res.json())
  .then(console.log);
```

## 🚨 Problemas Comunes

### Token expirado

**Síntoma:** 403 Forbidden o "Token inválido o expirado"
**Solución:** Hacer login nuevamente. Los tokens duran 24 horas.

### Token no se envía

**Síntoma:** 401 "No se proporcionó token"
**Solución:** Verificar que se usa `Bearer ${token}` en el header Authorization

### CORS bloqueando headers

**Síntoma:** Error de CORS
**Solución:** Ya está configurado en el backend, pero verifica que el origin en CORS incluye tu puerto React

### localStorage vacío después de refresh

**Síntoma:** Token desaparece al recargar
**Solución:** Usar `localStorage` en lugar de `sessionStorage`

## 📊 Flujo Completo

```
1. Usuario hace login → POST /login
2. Backend valida y devuelve token
3. React guarda token en localStorage
4. Todas las peticiones incluyen: Authorization: Bearer <token>
5. Backend verifica token en cada petición protegida
6. Si token válido → respuesta 200
7. Si token inválido → respuesta 401 → redirect a /login
```

## 🎯 Checklist de Verificación

- [ ] Token se guarda en localStorage después del login
- [ ] Token se incluye en header Authorization de TODAS las peticiones
- [ ] Formato correcto: `Authorization: Bearer ${token}` (con espacio)
- [ ] Backend tiene `verificarToken` en rutas protegidas
- [ ] CORS permite header Authorization
- [ ] Token no ha expirado (válido por 24h)
- [ ] Usuario existe y está activo en la base de datos

---

**¿Sigues teniendo problemas?**

1. Reinicia el servidor backend: `Ctrl+C` y `node index.js`
2. Haz logout y login nuevamente en React
3. Limpia localStorage: `localStorage.clear()` en consola
4. Verifica que el usuario tenga contraseña correcta en la BD
5. Revisa los logs del servidor para ver qué está fallando

¡Ahora tus peticiones deberían funcionar! 🎉
