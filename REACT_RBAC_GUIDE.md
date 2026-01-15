# 🎨 RBAC - Integración con React Frontend

## Guía para implementar control de roles en tu aplicación React

---

## 📦 Estructura Recomendada

```
src/
├── contexts/
│   └── AuthContext.jsx         # Contexto de autenticación con roles
├── hooks/
│   ├── useAuth.js             # Hook para acceder a auth
│   └── usePermissions.js      # Hook para verificar permisos
├── components/
│   ├── ProtectedRoute.jsx     # Componente para rutas protegidas
│   └── RoleBasedComponent.jsx # Mostrar/ocultar según rol
└── services/
    └── api.js                 # Funciones API con JWT
```

---

## 1️⃣ Contexto de Autenticación

### `src/contexts/AuthContext.jsx`

```jsx
import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Cargar datos del usuario al iniciar
  useEffect(() => {
    if (token) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUserData = async () => {
    try {
      const response = await fetch("http://localhost:3001/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setRoles(data.roles?.map((r) => r.nombre) || []);
        setPermisos(data.permisos?.map((p) => p.nombre) || []);
      } else {
        // Token inválido
        logout();
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const newToken = data.token;

        setToken(newToken);
        localStorage.setItem("token", newToken);

        // Cargar datos del usuario
        await loadUserData();

        return { success: true };
      } else {
        return { success: false, error: "Credenciales inválidas" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRoles([]);
    setPermisos([]);
    localStorage.removeItem("token");
  };

  // Verificar si tiene un rol específico
  const hasRole = (rol) => {
    return roles.includes(rol);
  };

  // Verificar si tiene alguno de los roles
  const hasAnyRole = (rolesArray) => {
    return rolesArray.some((rol) => roles.includes(rol));
  };

  // Verificar si tiene un permiso específico
  const hasPermission = (permiso) => {
    return permisos.includes(permiso);
  };

  // Verificar si es admin
  const isAdmin = () => {
    return roles.includes("admin");
  };

  const value = {
    user,
    roles,
    permisos,
    token,
    loading,
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasPermission,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

---

## 2️⃣ Hooks Personalizados

### `src/hooks/useAuth.js`

```javascript
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
};
```

### `src/hooks/usePermissions.js`

```javascript
import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { hasPermission, hasRole, hasAnyRole, isAdmin } = useAuth();

  return {
    // Permisos de usuarios
    canListUsers: () => hasPermission("usuarios.listar"),
    canCreateUser: () => hasPermission("usuarios.crear"),
    canEditUser: () => hasPermission("usuarios.editar"),
    canDeleteUser: () => hasPermission("usuarios.eliminar"),

    // Permisos de pagos
    canViewPayments: () => hasPermission("pagos.listar"),
    canCreatePayment: () => hasPermission("pagos.crear"),
    canViewPaymentStats: () => hasPermission("pagos.estadisticas"),

    // Permisos de productos
    canManageProducts: () => hasPermission("productos.crear"),
    canSellProducts: () => hasPermission("productos.vender"),

    // Permisos de rutinas
    canCreateRoutine: () => hasPermission("rutinas.crear"),
    canAssignRoutine: () => hasPermission("rutinas.asignar"),

    // Verificaciones por rol
    isAdmin,
    isTrainer: () => hasRole("entrenador"),
    isReceptionist: () => hasRole("recepcionista"),
    isClient: () => hasRole("cliente"),

    isStaff: () => hasAnyRole(["admin", "entrenador", "recepcionista"]),
  };
};
```

---

## 3️⃣ Componentes de Protección

### `src/components/ProtectedRoute.jsx`

```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ProtectedRoute = ({
  children,
  requireRole = null,
  requireAnyRole = null,
  requirePermission = null,
}) => {
  const { user, loading, hasRole, hasAnyRole, hasPermission } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol específico
  if (requireRole && !hasRole(requireRole)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  // Verificar cualquiera de los roles
  if (requireAnyRole && !hasAnyRole(requireAnyRole)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  // Verificar permiso específico
  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return children;
};
```

### `src/components/RoleBasedComponent.jsx`

```jsx
import { useAuth } from "../hooks/useAuth";

export const RoleBasedComponent = ({
  children,
  requireRole = null,
  requireAnyRole = null,
  requirePermission = null,
  fallback = null,
}) => {
  const { hasRole, hasAnyRole, hasPermission } = useAuth();

  let canRender = true;

  if (requireRole && !hasRole(requireRole)) {
    canRender = false;
  }

  if (requireAnyRole && !hasAnyRole(requireAnyRole)) {
    canRender = false;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    canRender = false;
  }

  return canRender ? children : fallback;
};
```

---

## 4️⃣ Servicio API

### `src/services/api.js`

```javascript
const API_URL = "http://localhost:3001";

// Helper para obtener el token
const getToken = () => localStorage.getItem("token");

// Helper para headers con autenticación
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// Obtener información del usuario actual
export const getMe = async () => {
  const response = await fetch(`${API_URL}/me`, {
    headers: getHeaders(),
  });
  return response.json();
};

// Obtener roles de un usuario
export const getUserRoles = async (userId) => {
  const response = await fetch(`${API_URL}/rbac/usuarios/${userId}/roles`, {
    headers: getHeaders(),
  });
  return response.json();
};

// Asignar rol a usuario (solo admin)
export const assignRole = async (userId, roleName) => {
  const response = await fetch(`${API_URL}/rbac/usuarios/${userId}/roles`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ rol: roleName }),
  });
  return response.json();
};

// Revocar rol de usuario (solo admin)
export const revokeRole = async (userId, roleName) => {
  const response = await fetch(
    `${API_URL}/rbac/usuarios/${userId}/roles/${roleName}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );
  return response.json();
};

// Obtener todos los roles disponibles
export const getAllRoles = async () => {
  const response = await fetch(`${API_URL}/rbac/roles`, {
    headers: getHeaders(),
  });
  return response.json();
};

// Obtener estadísticas RBAC
export const getRBACStats = async () => {
  const response = await fetch(`${API_URL}/rbac/estadisticas`, {
    headers: getHeaders(),
  });
  return response.json();
};
```

---

## 5️⃣ Ejemplos de Uso en Componentes

### Login Component

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Iniciar Sesión</button>
    </form>
  );
};
```

### Dashboard con Roles

```jsx
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import { RoleBasedComponent } from "../components/RoleBasedComponent";

export const Dashboard = () => {
  const { user, roles } = useAuth();
  const { isAdmin, isTrainer, canViewPaymentStats } = usePermissions();

  return (
    <div>
      <h1>Bienvenido, {user.nombre}</h1>
      <p>Roles: {roles.join(", ")}</p>

      {/* Solo para Admin */}
      <RoleBasedComponent requireRole="admin">
        <div className="admin-panel">
          <h2>Panel de Administración</h2>
          <button>Gestionar Usuarios</button>
          <button>Configuración</button>
        </div>
      </RoleBasedComponent>

      {/* Para Admin y Entrenadores */}
      <RoleBasedComponent requireAnyRole={["admin", "entrenador"]}>
        <div className="trainer-section">
          <h2>Gestión de Rutinas</h2>
          <button>Crear Rutina</button>
          <button>Asignar Rutina</button>
        </div>
      </RoleBasedComponent>

      {/* Por permiso específico */}
      {canViewPaymentStats() && (
        <div className="payments-stats">
          <h2>Estadísticas de Pagos</h2>
          {/* Contenido */}
        </div>
      )}
    </div>
  );
};
```

### App.jsx con Rutas Protegidas

```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { AdminPanel } from "./pages/AdminPanel";
import { Rutinas } from "./pages/Rutinas";

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rutinas"
            element={
              <ProtectedRoute requireAnyRole={["admin", "entrenador"]}>
                <Rutinas />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
```

### Component con Botones Condicionales

```jsx
import { usePermissions } from "../hooks/usePermissions";

export const UserList = () => {
  const { canCreateUser, canEditUser, canDeleteUser } = usePermissions();

  return (
    <div>
      <h2>Lista de Usuarios</h2>

      {canCreateUser() && <button onClick={handleCreate}>Crear Usuario</button>}

      <table>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.nombre}</td>
              <td>
                {canEditUser() && (
                  <button onClick={() => handleEdit(user.id)}>Editar</button>
                )}
                {canDeleteUser() && (
                  <button onClick={() => handleDelete(user.id)}>
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 6️⃣ Gestión de Roles (Panel Admin)

```jsx
import { useState, useEffect } from "react";
import {
  getAllRoles,
  getUserRoles,
  assignRole,
  revokeRole,
} from "../services/api";

export const RoleManagement = ({ userId }) => {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [roles, userRolesData] = await Promise.all([
        getAllRoles(),
        getUserRoles(userId),
      ]);

      setAvailableRoles(roles);
      setUserRoles(userRolesData.roles || []);
    } catch (error) {
      console.error("Error loading roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (roleName) => {
    try {
      await assignRole(userId, roleName);
      loadData(); // Recargar datos
    } catch (error) {
      console.error("Error assigning role:", error);
    }
  };

  const handleRevokeRole = async (roleName) => {
    try {
      await revokeRole(userId, roleName);
      loadData(); // Recargar datos
    } catch (error) {
      console.error("Error revoking role:", error);
    }
  };

  if (loading) return <div>Cargando...</div>;

  const userRoleNames = userRoles.map((r) => r.nombre);

  return (
    <div>
      <h3>Gestión de Roles - Usuario #{userId}</h3>

      <div>
        <h4>Roles Actuales:</h4>
        {userRoles.map((role) => (
          <div key={role.nombre}>
            {role.nombre} ({role.descripcion})
            <button onClick={() => handleRevokeRole(role.nombre)}>
              Revocar
            </button>
          </div>
        ))}
      </div>

      <div>
        <h4>Asignar Rol:</h4>
        <select onChange={(e) => handleAssignRole(e.target.value)}>
          <option value="">Seleccionar rol...</option>
          {availableRoles
            .filter((role) => !userRoleNames.includes(role.nombre))
            .map((role) => (
              <option key={role.nombre} value={role.nombre}>
                {role.nombre} - {role.descripcion}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};
```

---

## 🎯 Resumen

Con esta implementación tienes:

✅ **AuthContext** - Gestión centralizada de autenticación y roles  
✅ **Hooks personalizados** - useAuth y usePermissions para fácil acceso  
✅ **Componentes protegidos** - ProtectedRoute y RoleBasedComponent  
✅ **API Service** - Funciones para interactuar con backend  
✅ **Ejemplos prácticos** - Implementación en componentes reales

---

**¡Tu frontend React está listo para trabajar con RBAC!** 🚀
