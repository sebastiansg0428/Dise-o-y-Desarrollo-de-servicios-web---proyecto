-- ============================================
-- AGREGAR COLUMNA DE ROL A TABLA USUARIOS
-- Para compatibilidad con sistema actual
-- ============================================

-- Agregar columna rol si no existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'cliente' 
AFTER membresia;

-- Agregar índice para mejorar consultas
ALTER TABLE usuarios 
ADD INDEX IF NOT EXISTS idx_rol (rol);

-- Actualizar usuarios existentes con rol por defecto
UPDATE usuarios 
SET rol = 'cliente' 
WHERE rol IS NULL OR rol = '';

-- Asignar roles según criterios (puedes ajustar según tus necesidades)
-- Ejemplo: Si tienes un usuario específico que debe ser admin
-- UPDATE usuarios SET rol = 'admin' WHERE id = 1;

-- ============================================
-- COMENTARIOS
-- ============================================
/*
Esta columna 'rol' es para compatibilidad y consultas rápidas.
El sistema RBAC usa las tablas: usuarios_roles, roles, permisos
para un control más granular y profesional.

Puedes mantener ambos sistemas:
- 'rol' para consultas rápidas
- Tablas RBAC para control de permisos detallado
*/
