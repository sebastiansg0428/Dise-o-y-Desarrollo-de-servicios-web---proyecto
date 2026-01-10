-- ================================================================
-- SCRIPT PARA RECALCULAR FECHAS DE VENCIMIENTO
-- Ejecuta este script completo en phpMyAdmin
-- ================================================================

-- Recalcular fechas de vencimiento basándose en fecha_inicio_membresia
UPDATE usuarios 
SET fecha_vencimiento = DATE_ADD(fecha_inicio_membresia, INTERVAL 1 DAY)
WHERE membresia = 'diaria';

UPDATE usuarios 
SET fecha_vencimiento = DATE_ADD(fecha_inicio_membresia, INTERVAL 7 DAY)
WHERE membresia = 'semanal';

UPDATE usuarios 
SET fecha_vencimiento = DATE_ADD(fecha_inicio_membresia, INTERVAL 15 DAY)
WHERE membresia = 'quincenal';

UPDATE usuarios 
SET fecha_vencimiento = DATE_ADD(fecha_inicio_membresia, INTERVAL 30 DAY)
WHERE membresia = 'mensual';

UPDATE usuarios 
SET fecha_vencimiento = DATE_ADD(fecha_inicio_membresia, INTERVAL 365 DAY)
WHERE membresia = 'anual';

-- Verificar los resultados
SELECT 
    id,
    nombre,
    apellido,
    membresia,
    DATE_FORMAT(fecha_inicio_membresia, '%d/%m/%Y') as inicio,
    DATE_FORMAT(fecha_vencimiento, '%d/%m/%Y') as vence,
    DATEDIFF(fecha_vencimiento, CURDATE()) as dias_restantes,
    estado
FROM usuarios
ORDER BY id;
