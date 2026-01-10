-- ==================================================================================
-- ACTUALIZACIÓN TABLA USUARIOS - Agregar campo fecha_inicio_membresia y tipo diaria
-- ==================================================================================
-- Fecha: 8 de enero de 2026
-- Descripción: Agrega la columna fecha_inicio_membresia y actualiza el ENUM de membresia
-- ==================================================================================

-- Agregar columna fecha_inicio_membresia después de estado
ALTER TABLE `usuarios` 
ADD COLUMN `fecha_inicio_membresia` date DEFAULT NULL 
AFTER `estado`;

-- Modificar columna membresia para incluir todos los tipos (mantiene valores antiguos y agrega nuevos)
ALTER TABLE `usuarios` 
MODIFY COLUMN `membresia` enum('basica','premium','vip','DIARIA','SEMANAL','QUINCENAL','MENSUAL','ANUAL') DEFAULT 'MENSUAL';

-- ==================================================================================
-- FIN DEL SCRIPT
-- ==================================================================================
