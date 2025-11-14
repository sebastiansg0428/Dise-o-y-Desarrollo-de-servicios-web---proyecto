# Sistema de Autenticación - Backend con Frontend Integrado

## Estructura del Proyecto
```
ejemplo_backEnd/
├── index.js              # Servidor backend con Express
├── package.json          # Dependencias del proyecto
├── public/
│   ├── index.html        # Página de login/registro
│   └── home.html         # Página principal
└── README.md
```

## Instalación y Ejecución

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar el servidor:
   ```bash
   npm start
   ```
   El servidor correrá en http://localhost:3001

## Funcionalidades

### Backend
- **GET /login**: Autenticación de usuarios
- **GET /register**: Registro de nuevos usuarios
- Conexión a base de datos MySQL
- Servir archivos estáticos desde /public

### Frontend
- **Página Login/Register**: Formularios integrados con JavaScript vanilla
- **Navegación**: Cambio entre login y registro
- **Validaciones**: Confirmación de contraseña
- **Feedback**: Mensajes de éxito y error
- **Diseño responsive**: Estilos CSS integrados

## Base de Datos
Asegúrate de tener una tabla `usuarios` en tu base de datos MySQL:

```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);
```

## Uso
1. Abre http://localhost:3001 en tu navegador
2. Usa el formulario de registro para crear una cuenta
3. Cambia al login para iniciar sesión
4. Después del login exitoso serás redirigido a la página principal