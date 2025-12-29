-- ==================== ACTUALIZACIÓN DE MEMBRESÍAS ====================
-- Script para actualizar el sistema de membresías de básica/premium/vip
-- a día/semanal/quincenal/mensual/anual con precios colombianos

-- 1. Actualizar la columna membresia para aceptar los nuevos valores
ALTER TABLE usuarios 
MODIFY COLUMN membresia ENUM('dia', 'semanal', 'quincenal', 'mensual', 'anual') DEFAULT 'dia';

-- 2. Migrar datos existentes (convertir básica -> día, premium -> mensual, vip -> anual)
UPDATE usuarios SET membresia = 'dia' WHERE membresia = 'basica';
UPDATE usuarios SET membresia = 'mensual' WHERE membresia = 'premium';
UPDATE usuarios SET membresia = 'anual' WHERE membresia = 'vip';

-- 3. Actualizar precios según el nuevo esquema
UPDATE usuarios SET precio_membresia = 4000 WHERE membresia = 'dia';
UPDATE usuarios SET precio_membresia = 30000 WHERE membresia = 'semanal';
UPDATE usuarios SET precio_membresia = 40000 WHERE membresia = 'quincenal';
UPDATE usuarios SET precio_membresia = 60000 WHERE membresia = 'mensual';
UPDATE usuarios SET precio_membresia = 600000 WHERE membresia = 'anual';

-- 4. Actualizar tabla de pagos si existe la columna tipo_pago
UPDATE pagos SET tipo_pago = 'membresia_dia' WHERE tipo_pago = 'membresia' AND concepto LIKE '%Día%';
UPDATE pagos SET tipo_pago = 'membresia_semanal' WHERE tipo_pago = 'membresia' AND concepto LIKE '%Semanal%';
UPDATE pagos SET tipo_pago = 'membresia_quincenal' WHERE tipo_pago = 'membresia' AND concepto LIKE '%Quincenal%';
UPDATE pagos SET tipo_pago = 'membresia_mensual' WHERE tipo_pago = 'membresia' AND concepto LIKE '%Mensual%';
UPDATE pagos SET tipo_pago = 'membresia_anual' WHERE tipo_pago = 'membresia' AND concepto LIKE '%Anual%';

-- 5. Actualizar procedimiento almacenado si existe
DROP PROCEDURE IF EXISTS sp_renovar_membresia_con_pago;

DELIMITER //
CREATE PROCEDURE sp_renovar_membresia_con_pago(
    IN p_usuario_id INT,
    IN p_tipo_membresia ENUM('dia', 'semanal', 'quincenal', 'mensual', 'anual'),
    IN p_metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata'),
    IN p_comprobante VARCHAR(100),
    OUT p_pago_id INT,
    OUT p_factura_numero VARCHAR(20)
)
BEGIN
    DECLARE v_monto DECIMAL(10,2);
    DECLARE v_impuesto DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    DECLARE v_factura_id INT;
    
    -- Determinar monto según tipo de membresía
    SET v_monto = CASE p_tipo_membresia
        WHEN 'dia' THEN 4000
        WHEN 'semanal' THEN 30000
        WHEN 'quincenal' THEN 40000
        WHEN 'mensual' THEN 60000
        WHEN 'anual' THEN 600000
        ELSE 4000
    END;
    
    -- Calcular impuesto (19% IVA en Colombia)
    SET v_impuesto = v_monto * 0.19;
    SET v_total = v_monto + v_impuesto;
    
    -- Fechas de vigencia
    SET v_fecha_inicio = CURDATE();
    SET v_fecha_fin = CASE p_tipo_membresia
        WHEN 'dia' THEN DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        WHEN 'semanal' THEN DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        WHEN 'quincenal' THEN DATE_ADD(CURDATE(), INTERVAL 15 DAY)
        WHEN 'mensual' THEN DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
        WHEN 'anual' THEN DATE_ADD(CURDATE(), INTERVAL 1 YEAR)
        ELSE DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    END;
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Crear pago
    INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, comprobante, estado, fecha_pago)
    VALUES (p_usuario_id, 'membresia', CONCAT('Renovación membresía ', UPPER(p_tipo_membresia)), v_monto, p_metodo_pago, p_comprobante, 'pagado', NOW());
    
    SET p_pago_id = LAST_INSERT_ID();
    
    -- Generar número de factura
    SET p_factura_numero = CONCAT('FAC-', YEAR(NOW()), '-', LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura, 10) AS UNSIGNED)), 0) + 1 FROM facturas WHERE YEAR(fecha_emision) = YEAR(NOW())), 4, '0'));
    
    -- Crear factura
    INSERT INTO facturas (numero_factura, pago_id, usuario_id, subtotal, impuesto, total, estado, fecha_emision)
    VALUES (p_factura_numero, p_pago_id, p_usuario_id, v_monto, v_impuesto, v_total, 'pagada', NOW());
    
    SET v_factura_id = LAST_INSERT_ID();
    
    -- Agregar detalle de factura
    INSERT INTO facturas_detalles (factura_id, descripcion, cantidad, precio_unitario, subtotal)
    VALUES (v_factura_id, CONCAT('Membresía ', UPPER(p_tipo_membresia), ' - Gimnasio'), 1, v_monto, v_monto);
    
    -- Actualizar membresía del usuario
    UPDATE usuarios 
    SET membresia = p_tipo_membresia,
        precio_membresia = v_monto,
        fecha_vencimiento = v_fecha_fin,
        estado = 'activo'
    WHERE id = p_usuario_id;
    
    -- Registrar en historial de membresías
    INSERT INTO membresias_pagos (usuario_id, pago_id, tipo_membresia, monto, fecha_inicio, fecha_fin)
    VALUES (p_usuario_id, p_pago_id, p_tipo_membresia, v_monto, v_fecha_inicio, v_fecha_fin);
    
    COMMIT;
END //
DELIMITER ;

-- Verificar cambios
SELECT 'Membresías actualizadas correctamente' AS mensaje;
SELECT membresia, COUNT(*) as cantidad, AVG(precio_membresia) as precio_promedio
FROM usuarios
GROUP BY membresia;
