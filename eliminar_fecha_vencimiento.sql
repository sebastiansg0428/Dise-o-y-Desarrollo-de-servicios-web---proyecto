-- ==================== ELIMINAR COLUMNA FECHA_VENCIMIENTO ====================
-- Script para eliminar la columna fecha_vencimiento de la tabla pagos
-- Ejecutar este script en phpMyAdmin o MySQL

-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar este script
-- Comando de backup: mysqldump -u root -p meli > backup_antes_eliminar_columna.sql

USE meli;

-- Verificar que la columna existe antes de eliminar
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'meli' 
AND TABLE_NAME = 'pagos' 
AND COLUMN_NAME = 'fecha_vencimiento';

-- Eliminar la columna fecha_vencimiento
ALTER TABLE pagos 
DROP COLUMN fecha_vencimiento;

-- Verificar que la columna fue eliminada
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'meli' 
AND TABLE_NAME = 'pagos';

-- Mensaje de confirmación
SELECT 'Columna fecha_vencimiento eliminada exitosamente de la tabla pagos' as mensaje;

-- ==================== FIN DEL SCRIPT ====================
