-- Script para actualizar las membresías del gimnasio
-- Elimina: premium, basica, vip
-- Mantiene solo: dia, semana, quincena, mensualidad, anual

-- PASO 1: Ver qué valores existen actualmente
SELECT DISTINCT membresia, COUNT(*) as cantidad 
FROM `usuarios` 
GROUP BY membresia;

-- PASO 2: Modificar la tabla usuarios para cambiar el tipo ENUM
-- Primero, cambiamos temporalmente la columna a VARCHAR
ALTER TABLE `usuarios` 
MODIFY COLUMN `membresia` VARCHAR(20) DEFAULT 'dia';

-- PASO 3: Actualizar las membresías existentes a los nuevos nombres
-- Normalizar a minúsculas y quitar espacios primero
UPDATE `usuarios` 
SET `membresia` = LOWER(TRIM(`membresia`));

-- Convertir 'basica' a 'semanal' (membresía más básica pero no diaria)
UPDATE `usuarios` 
SET `membresia` = 'semanal', `precio_membresia` = 30000.00
WHERE `membresia` IN ('basica', 'básica', 'semana');

-- Convertir 'premium' a 'mensual' (membresía estándar)
UPDATE `usuarios` 
SET `membresia` = 'mensual', `precio_membresia` = 60000.00
WHERE `membresia` IN ('premium', 'mensualidad');

-- Convertir 'vip' a 'anual' (membresía de mayor duración)
UPDATE `usuarios` 
SET `membresia` = 'anual', `precio_membresia` = 600000.00
WHERE `membresia` = 'vip';

-- Convertir 'quincenal' y variantes a 'quincenal'
UPDATE `usuarios` 
SET `membresia` = 'quincenal'
WHERE `membresia` IN ('quincena');

-- Convertir 'dia' y variantes a 'diaria'
UPDATE `usuarios` 
SET `membresia` = 'diaria'
WHERE `membresia` IN ('dia', 'diario');

-- Cualquier otro valor no reconocido lo convertimos a 'diaria' por defecto
UPDATE `usuarios` 
SET `membresia` = 'diaria', `precio_membresia` = 4000.00
WHERE `membresia` NOT IN ('diaria', 'semanal', 'quincenal', 'mensual', 'anual');

-- PASO 4: Verificar que todos los valores son válidos antes del cambio
SELECT DISTINCT membresia, COUNT(*) as cantidad 
FROM `usuarios` 
GROUP BY membresia;

-- PASO 5: Cambiar la columna de VARCHAR a ENUM con los nuevos valores
ALTER TABLE `usuarios` 
MODIFY COLUMN `membresia` ENUM('diaria','semanal','quincenal','mensual','anual') DEFAULT 'diaria';

-- PASO 6: Actualizar las fechas de vencimiento según la nueva membresía
-- Para membresías diaria
UPDATE `usuarios` 
SET `fecha_vencimiento` = DATE_ADD(`fecha_inicio_membresia`, INTERVAL 1 DAY)
WHERE `membresia` = 'diaria' AND `fecha_inicio_membresia` IS NOT NULL;

-- Para membresías semanal (anteriormente basica)
UPDATE `usuarios` 
SET `fecha_vencimiento` = DATE_ADD(`fecha_inicio_membresia`, INTERVAL 7 DAY)
WHERE `membresia` = 'semanal' AND `fecha_inicio_membresia` IS NOT NULL;

-- Para membresías quincenal
UPDATE `usuarios` 
SET `fecha_vencimiento` = DATE_ADD(`fecha_inicio_membresia`, INTERVAL 15 DAY)
WHERE `membresia` = 'quincenal' AND `fecha_inicio_membresia` IS NOT NULL;

-- Para membresías mensual (anteriormente premium)
UPDATE `usuarios` 
SET `fecha_vencimiento` = DATE_ADD(`fecha_inicio_membresia`, INTERVAL 30 DAY)
WHERE `membresia` = 'mensual' AND `fecha_inicio_membresia` IS NOT NULL;

-- Para membresías anual (anteriormente vip)
UPDATE `usuarios` 
SET `fecha_vencimiento` = DATE_ADD(`fecha_inicio_membresia`, INTERVAL 365 DAY)
WHERE `membresia` = 'anual' AND `fecha_inicio_membresia` IS NOT NULL;

-- PASO 7: Verificar los cambios FINALES
SELECT 
    id,
    nombre,
    apellido,
    email,
    membresia,
    precio_membresia,
    DATE_FORMAT(fecha_inicio_membresia, '%d/%m/%Y') as fecha_inicio,
    DATE_FORMAT(fecha_vencimiento, '%d/%m/%Y') as fecha_vencimiento,
    DATEDIFF(fecha_vencimiento, CURDATE()) as dias_restantes,
    estado
FROM `usuarios`
ORDER BY id;

-- Resumen de cambios:
-- basica (30.00)   → semanal (30000.00)   - 7 días
-- premium (50.00)  → mensual (60000.00)   - 30 días  
-- vip (80.00)      → anual (600000.00)    - 365 días

-- Nuevas opciones disponibles (COINCIDEN CON FRONTEND):
-- diaria     - 4000.00   - 1 día
-- semanal    - 30000.00  - 7 días
-- quincenal  - 40000.00  - 15 días
-- mensual    - 60000.00  - 30 días
-- anual      - 600000.00 - 365 días
