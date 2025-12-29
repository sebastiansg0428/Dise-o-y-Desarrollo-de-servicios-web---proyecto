-- ============================================
-- AGREGAR CAMPO FECHA_INICIO_MEMBRESIA
-- ============================================
-- Este campo es CRÍTICO para gimnasios porque permite:
-- 1. Saber exactamente cuándo pagó el cliente
-- 2. Calcular renovaciones correctamente
-- 3. Generar reportes de ingresos por período
-- 4. Auditoría de pagos
-- ============================================

USE meli;

-- Agregar columna fecha_inicio_membresia
ALTER TABLE `usuarios` 
ADD COLUMN `fecha_inicio_membresia` DATE DEFAULT NULL 
AFTER `fecha_vencimiento`;

-- Agregar índice para consultas rápidas
ALTER TABLE `usuarios` 
ADD INDEX `idx_fecha_inicio_membresia` (`fecha_inicio_membresia`);

-- Actualizar registros existentes (poner fecha actual como inicio)
UPDATE `usuarios` 
SET `fecha_inicio_membresia` = CURDATE() 
WHERE `fecha_inicio_membresia` IS NULL AND `estado` = 'activo';

-- Agregar comentarios a las columnas para documentación
ALTER TABLE `usuarios` 
MODIFY COLUMN `fecha_inicio_membresia` DATE DEFAULT NULL 
COMMENT 'Fecha en que inició o pagó la membresía actual';

ALTER TABLE `usuarios` 
MODIFY COLUMN `fecha_vencimiento` DATE DEFAULT NULL 
COMMENT 'Fecha en que vence la membresía actual';

-- ============================================
-- VERIFICAR LA ESTRUCTURA
-- ============================================
DESCRIBE usuarios;

-- ============================================
-- CONSULTA DE PRUEBA
-- ============================================
SELECT 
    id, 
    nombre, 
    apellido,
    membresia,
    DATE_FORMAT(fecha_inicio_membresia, '%d/%m/%Y') as inicio_membresia,
    DATE_FORMAT(fecha_vencimiento, '%d/%m/%Y') as vence_membresia,
    DATEDIFF(fecha_vencimiento, CURDATE()) as dias_restantes,
    precio_membresia,
    estado
FROM usuarios
WHERE estado = 'activo'
ORDER BY fecha_inicio_membresia DESC;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- • fecha_inicio_membresia: Cuándo PAGÓ/INICIÓ la membresía
-- • fecha_vencimiento: Cuándo VENCE la membresía
-- • La diferencia entre ambas es la duración de la membresía
-- • Esto permite calcular renovaciones y generar reportes precisos
-- ============================================
