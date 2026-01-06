-- ====================================================================
-- SCRIPT: Actualizar pagos sin estado y fecha_pago
-- ====================================================================
-- Este script actualiza los pagos existentes que tienen NULL en estado o fecha_pago
-- y elimina/recrea el trigger para evitar conflictos

USE meli;

-- 1. Actualizar todos los pagos que no tienen estado (NULL)
UPDATE pagos 
SET estado = 'pagado' 
WHERE estado IS NULL;

-- 2. Actualizar fecha_pago para pagos que no la tienen
UPDATE pagos 
SET fecha_pago = created_at 
WHERE fecha_pago IS NULL AND created_at IS NOT NULL;

-- 3. Si created_at también es NULL, usar fecha actual
UPDATE pagos 
SET fecha_pago = NOW() 
WHERE fecha_pago IS NULL;

-- 4. Eliminar el trigger si existe (puede estar causando conflictos)
DROP TRIGGER IF EXISTS trg_actualizar_fecha_pago;

-- 5. Recrear el trigger de forma más segura
DELIMITER //
CREATE TRIGGER trg_actualizar_fecha_pago 
BEFORE UPDATE ON pagos
FOR EACH ROW
BEGIN
    -- Solo actualizar fecha_pago si cambia a pagado y no tenía fecha
    IF NEW.estado = 'pagado' AND (OLD.estado IS NULL OR OLD.estado != 'pagado') AND NEW.fecha_pago IS NULL THEN
        SET NEW.fecha_pago = NOW();
    END IF;
END //
DELIMITER ;

-- 6. Verificar que todos los pagos tengan estado y fecha_pago
SELECT 
    COUNT(*) as total_pagos,
    SUM(CASE WHEN estado IS NULL THEN 1 ELSE 0 END) as sin_estado,
    SUM(CASE WHEN fecha_pago IS NULL THEN 1 ELSE 0 END) as sin_fecha_pago,
    SUM(CASE WHEN estado = 'pagado' THEN 1 ELSE 0 END) as pagados,
    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes
FROM pagos;

-- 7. Mostrar últimos 10 pagos con sus datos completos
SELECT 
    id,
    usuario_id,
    concepto,
    monto,
    estado,
    DATE_FORMAT(fecha_pago, '%d/%m/%Y %H:%i') as fecha_pago,
    DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') as fecha_registro
FROM pagos
ORDER BY id DESC
LIMIT 10;
