# 🏋️ Sistema de Gestión de Gimnasio - Backend Completo

## 🚀 Características Principales

- **Gestión completa de usuarios** con membresías y estados
- **Control de accesos** con entrada/salida automática
- **Sistema de pagos** y facturación
- **Clases grupales** con reservas y capacidad
- **Rutinas personalizadas** y seguimiento
- **Estadísticas avanzadas** del gimnasio
- **API REST optimizada** con validaciones

## 📁 Estructura del Proyecto

```
ejemplo_backEnd/
├── index.js              # Servidor principal optimizado
├── usuarios.sql          # Base de datos completa
├── package.json          # Dependencias actualizadas
├── public/               # Frontend (opcional)
└── README.md            # Esta documentación
```

## ⚡ Instalación Rápida

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar base de datos:**
   ```bash
   # Importar estructura completa
   mysql -u root -p meli < usuarios.sql
   ```

3. **Iniciar servidor:**
   ```bash
   npm start
   # o para desarrollo:
   npm run dev
   ```

## 🗄️ Base de Datos Mejorada

### Tablas Principales:
- **usuarios** - Información completa con membresías y vencimientos
- **accesos** - Control de entrada/salida con duración
- **pagos** - Facturación y métodos de pago
- **clases** - Clases grupales con instructores
- **horarios_clases** - Programación semanal
- **reservas_clases** - Sistema de reservas
- **rutinas** - Rutinas personalizadas
- **ejercicios** - Catálogo de ejercicios
- **productos** - Inventario y ventas

### Campos Nuevos en Usuarios:
- `apellido`, `telefono`, `fecha_nacimiento`, `genero`
- `fecha_vencimiento`, `precio_membresia`
- `total_visitas` (contador automático)
- Índices optimizados para consultas rápidas

## 🔗 API Endpoints

### 👤 **USUARIOS**
```http
POST   /login                    # Iniciar sesión
POST   /register                 # Registro completo
GET    /usuarios                 # Listar con filtros
GET    /usuarios/:id             # Ver individual + rutinas + pagos
PUT    /usuarios/:id             # Actualizar datos
PUT    /usuarios/:id/estado      # Cambiar estado
GET    /usuarios/estadisticas    # Dashboard completo
```

**Filtros disponibles:**
- `?estado=activo` - Solo usuarios activos
- `?membresia=premium` - Por tipo de membresía
- `?vencidos=true` - Membresías vencidas

### 🚪 **CONTROL DE ACCESOS**
```http
POST   /accesos/entrada          # Registrar entrada
PUT    /accesos/:id/salida       # Registrar salida
```

**Validaciones automáticas:**
- ✅ Usuario activo y membresía vigente
- ✅ No permitir doble entrada
- ✅ Actualizar contador de visitas

### 💰 **PAGOS**
```http
POST   /pagos                    # Crear factura
PUT    /pagos/:id/pagar          # Marcar como pagado
```

### 🏃 **CLASES GRUPALES**
```http
GET    /clases                   # Listar con horarios
POST   /clases/reservar          # Reservar clase
```

**Control de capacidad:**
- ✅ Verificar cupos disponibles
- ✅ Evitar reservas duplicadas
- ✅ Gestión de horarios semanales

### 💪 **RUTINAS**
```http
GET    /rutinas                  # Listar rutinas
POST   /usuarios/:id/rutinas     # Asignar rutina
```

## 📊 Estadísticas Avanzadas

El endpoint `/usuarios/estadisticas` proporciona:

```json
{
  "total_usuarios": 150,
  "usuarios_activos": 142,
  "usuarios_inactivos": 5,
  "usuarios_suspendidos": 3,
  "membresia_basica": 80,
  "membresia_premium": 45,
  "membresia_vip": 25,
  "membresias_vencidas": 12,
  "visitas_hoy": 35,
  "visitas_semana": 180,
  "ingresos_mensuales_potenciales": 7500.00,
  "promedio_visitas_usuario": 15.2
}
```

## 🔧 Ejemplos de Uso

### Registrar Usuario Completo
```bash
POST /register
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@gym.com",
  "password": "123456",
  "telefono": "555-0123",
  "fecha_nacimiento": "1990-05-15",
  "genero": "M",
  "membresia": "premium"
}
```

### Control de Acceso
```bash
# Entrada
POST /accesos/entrada
{"usuario_id": 1}

# Salida (automática con duración)
PUT /accesos/15/salida
```

### Reservar Clase
```bash
POST /clases/reservar
{
  "usuario_id": 1,
  "horario_clase_id": 3,
  "fecha_clase": "2024-12-20"
}
```

## 🛡️ Validaciones Implementadas

- ✅ **Membresías vencidas** - Bloqueo automático de acceso
- ✅ **Capacidad de clases** - Control de cupos
- ✅ **Emails únicos** - Prevención de duplicados
- ✅ **Estados válidos** - Solo valores permitidos
- ✅ **Accesos duplicados** - Una entrada por usuario
- ✅ **Datos requeridos** - Validación de campos obligatorios

## 🚀 Mejoras Implementadas

### Rendimiento:
- Pool de conexiones MySQL optimizado
- Índices en campos frecuentemente consultados
- Consultas JOIN eficientes

### Funcionalidad:
- Sistema completo de membresías con vencimientos
- Control automático de accesos
- Estadísticas en tiempo real
- Gestión de clases grupales
- Facturación integrada

### Seguridad:
- Validación de parámetros
- Manejo de errores robusto
- Prevención de SQL injection
- Estados controlados por ENUM

## 🔄 Próximas Mejoras Sugeridas

1. **Autenticación JWT** - Tokens seguros
2. **Encriptación de contraseñas** - bcrypt
3. **Notificaciones** - Emails automáticos
4. **Reportes PDF** - Facturas y estadísticas
5. **API de pagos** - Integración con pasarelas
6. **Dashboard web** - Interfaz administrativa

## 🏃‍♂️ Inicio Rápido

```bash
# Clonar e instalar
git clone [tu-repo]
cd ejemplo_backEnd
npm install

# Configurar DB
mysql -u root -p meli < usuarios.sql

# Iniciar
npm start
```

¡Tu sistema de gimnasio estará corriendo en `http://localhost:3001`! 🎉

---

**Desarrollado para gestión profesional de gimnasios** 💪