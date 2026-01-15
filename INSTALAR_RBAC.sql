-- ============================================
-- SCRIPT RÁPIDO: INSTALAR Y CONFIGURAR RBAC
-- Ejecuta este archivo para instalar todo el sistema
-- ============================================

-- Paso 1: Crear las tablas y sistema completo
SOURCE rbac_sistema_completo.sql;

-- Paso 2: Agregar columna rol a tabla usuarios (opcional)
SOURCE agregar_rol_usuarios.sql;

-- Paso 3: Asignar rol admin al primer usuario
-- Reemplaza el 1 con el ID de tu usuario administrador
CALL asignar_rol_usuario(1, 'admin', 1);

-- Verificar que todo está OK
SELECT 'INSTALACIÓN COMPLETADA' as mensaje;

-- Ver roles disponibles
SELECT id, nombre, descripcion, nivel FROM roles WHERE activo = 1;

-- Ver cuántos permisos hay
SELECT COUNT(*) as total_permisos FROM permisos;

-- Ver roles asignados
SELECT 
    u.id,
    u.nombre,
    u.email,
    r.nombre as rol,
    r.nivel
FROM usuarios u
LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id AND ur.activo = 1
LEFT JOIN roles r ON ur.rol_id = r.id
LIMIT 10;

-- ============================================
-- ¡Listo! Ahora reinicia el servidor:
-- node index.js
-- ============================================
