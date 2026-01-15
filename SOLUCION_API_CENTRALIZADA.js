// ==========================================
// SOLUCIÓN: API Centralizada para React
// Copia este archivo en tu frontend: src/services/api.js
// ==========================================

import axios from 'axios';

const API_URL = 'http://localhost:3001';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ INTERCEPTOR: Agrega el token automáticamente a TODAS las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token agregado:', token.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No hay token - la petición puede fallar');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ INTERCEPTOR: Maneja errores 401 automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('🔒 Error 401: Token inválido o expirado');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==========================================
// FUNCIONES HELPER - USA ESTAS EN TUS COMPONENTES
// ==========================================

export const getUsuarios = (params = {}) => {
  return api.get('/usuarios', { params });
};

export const getUsuariosEstadisticas = () => {
  return api.get('/usuarios/estadisticas');
};

export const getPagos = (params = {}) => {
  return api.get('/pagos', { params });
};

export const getDashboard = () => {
  return api.get('/dashboard');
};

export const getReportes = {
  ingresosMensuales: () => api.get('/reportes/ingresos-mensuales'),
  usuariosInactivos: () => api.get('/reportes/usuarios-inactivos'),
  membresiasVencer: () => api.get('/reportes/usuarios-con-membresia-por-vencer')
};

export default api;

// ==========================================
// EJEMPLO DE USO EN COMPONENTES
// ==========================================

/*

// En Dashboard.jsx
import { getUsuarios, getPagos, getDashboard } from '../services/api';

const Dashboard = () => {
  const [usuarios, setUsuarios] = useState([]);
  
  useEffect(() => {
    cargarDatos();
  }, []);
  
  const cargarDatos = async () => {
    try {
      // ✅ Ya no necesitas pasar el token manualmente
      const usuariosRes = await getUsuarios();
      setUsuarios(usuariosRes.data);
      
      const pagosRes = await getPagos({ tipo_pago: 'membresia' });
      console.log(pagosRes.data);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };
  
  return <div>...</div>;
};

// En ClientesTab.jsx
import api, { getUsuarios, getUsuariosEstadisticas } from '../services/api';

const ClientesTab = () => {
  const cargarUsuarios = async () => {
    try {
      // Con filtros
      const response = await getUsuarios({
        estado: 'activo',
        membresia: 'mensual'
      });
      console.log(response.data);
      
      // Estadísticas
      const stats = await getUsuariosEstadisticas();
      console.log(stats.data);
      
    } catch (error) {
      console.error('Error:', error);
    }
  };
};

// Para peticiones personalizadas
import api from '../services/api';

const response = await api.post('/productos', { nombre: 'Producto X' });
const data = await api.get('/rutinas/123');

*/

// ==========================================
// VERIFICACIÓN DE TOKEN
// ==========================================

export const verificarToken = async () => {
  try {
    const response = await api.get('/api/verify-token');
    return response.data;
  } catch (error) {
    console.error('Token inválido:', error);
    return null;
  }
};

// ==========================================
// LOGIN Y LOGOUT
// ==========================================

export const login = async (email, password) => {
  try {
    // No usa interceptor porque no hay token aún
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password
    });
    
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      console.log('✅ Login exitoso, token guardado');
      return response.data;
    }
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};
