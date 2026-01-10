-- Script para recalcular las fechas de vencimiento de todos los usuarios existentes
-- basándose en su membresía actual

-- Actualizar fechas para membresía DIARIA
UPDATE usuarios 
SET fecha_inicio_membresia = CURDATE(),
    fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
WHERE membresia = 'diaria';

-- Actualizar fechas para membresía SEMANAL
UPDATE usuarios 
SET fecha_inicio_membresia = CURDATE(),
    fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 7 DAY)
WHERE membresia = 'semanal';

-- Actualizar fechas para membresía QUINCENAL
UPDATE usuarios 
SET fecha_inicio_membresia = CURDATE(),
    fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 15 DAY)
WHERE membresia = 'quincenal';

-- Actualizar fechas para membresía MENSUAL
UPDATE usuarios 
SET fecha_inicio_membresia = CURDATE(),
    fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 30 DAY)
WHERE membresia = 'mensual';

-- Actualizar fechas para membresía ANUAL
UPDATE usuarios 
SET fecha_inicio_membresia = CURDATE(),
    fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 365 DAY)
WHERE membresia = 'anual';

-- Verificar los cambios
SELECT 
    id,
    nombre,
    apellido,
    membresia,
    precio_membresia,
    DATE_FORMAT(fecha_inicio_membresia, '%d/%m/%Y') as fecha_inicio,
    DATE_FORMAT(fecha_vencimiento, '%d/%m/%Y') as fecha_vencimiento,
    DATEDIFF(fecha_vencimiento, CURDATE()) as dias_restantes,
    estado
FROM usuarios
ORDER BY id;
