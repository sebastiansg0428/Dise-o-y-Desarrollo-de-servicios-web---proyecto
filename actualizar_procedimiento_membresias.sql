-- Script para actualizar el procedimiento almacenado sp_renovar_membresia_con_pago
-- Actualiza para usar las nuevas membresías: dia, semana, quincena, mensualidad, anual

-- Primero eliminar el procedimiento existente
DROP PROCEDURE IF EXISTS sp_renovar_membresia_con_pago;

DELIMITER //

-- Procedimiento para renovar membresía con pago (ACTUALIZADO)
CREATE PROCEDURE sp_renovar_membresia_con_pago(
    IN p_usuario_id INT,
    IN p_tipo_membresia ENUM('diaria', 'semanal', 'quincenal', 'mensual', 'anual'),
    IN p_metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata'),
    IN p_comprobante VARCHAR(500),
    OUT p_pago_id INT,
    OUT p_factura_numero VARCHAR(50)
)
BEGIN
    DECLARE v_monto DECIMAL(10,2);
    DECLARE v_impuesto DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    DECLARE v_factura_id INT;
    DECLARE v_dias_membresia INT;
    
    -- Determinar monto y días según tipo de membresía
    SET v_monto = CASE p_tipo_membresia
        WHEN 'diaria' THEN 4000.00
        WHEN 'semanal' THEN 30000.00
        WHEN 'quincenal' THEN 40000.00
        WHEN 'mensual' THEN 60000.00
        WHEN 'anual' THEN 600000.00
    END;
    
    SET v_dias_membresia = CASE p_tipo_membresia
        WHEN 'diaria' THEN 1
        WHEN 'semanal' THEN 7
        WHEN 'quincenal' THEN 15
        WHEN 'mensual' THEN 30
        WHEN 'anual' THEN 365
    END;
    
    -- Calcular impuesto (19% IVA en Colombia)
    SET v_impuesto = v_monto * 0.19;
    SET v_total = v_monto + v_impuesto;
    
    -- Fechas de vigencia
    SET v_fecha_inicio = CURDATE();
    SET v_fecha_fin = DATE_ADD(CURDATE(), INTERVAL v_dias_membresia DAY);
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Crear pago
    INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, estado, fecha_pago, comprobante)
    VALUES (p_usuario_id, 'membresia', CONCAT('Membresía ', UPPER(p_tipo_membresia), ' - ', DATE_FORMAT(NOW(), '%d/%m/%Y')), 
            v_total, p_metodo_pago, 'pagado', NOW(), p_comprobante);
    
    SET p_pago_id = LAST_INSERT_ID();
    
    -- Generar número de factura
    SET p_factura_numero = CONCAT('FAC-', YEAR(NOW()), '-', LPAD(
        (SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura, 10) AS UNSIGNED)), 0) + 1 
         FROM facturas 
         WHERE YEAR(fecha_emision) = YEAR(NOW())), 4, '0'
    ));
    
    -- Crear factura
    INSERT INTO facturas (numero_factura, pago_id, usuario_id, subtotal, impuesto, descuento, total, estado, fecha_vencimiento)
    VALUES (p_factura_numero, p_pago_id, p_usuario_id, v_monto, v_impuesto, 0.00, v_total, 'pagada', v_fecha_fin);
    
    SET v_factura_id = LAST_INSERT_ID();
    
    -- Agregar detalle de factura
    INSERT INTO facturas_detalles (factura_id, descripcion, cantidad, precio_unitario, subtotal)
    VALUES (v_factura_id, CONCAT('Membresía ', UPPER(p_tipo_membresia), ' - ', v_dias_membresia, ' días'), 1, v_monto, v_monto);
    
    -- Registrar en historial de membresías (si existe la tabla)
    INSERT INTO membresias_pagos (usuario_id, pago_id, tipo_membresia, monto, fecha_inicio, fecha_fin)
    VALUES (p_usuario_id, p_pago_id, p_tipo_membresia, v_total, v_fecha_inicio, v_fecha_fin);
    
    -- Actualizar usuario
    UPDATE usuarios 
    SET membresia = p_tipo_membresia,
        precio_membresia = v_monto,
        fecha_inicio_membresia = v_fecha_inicio,
        fecha_vencimiento = v_fecha_fin,
        estado = 'activo',
        updated_at = NOW()
    WHERE id = p_usuario_id;
    
    COMMIT;
END //

DELIMITER ;

-- Verificar que el procedimiento se creó correctamente
SHOW PROCEDURE STATUS WHERE Name = 'sp_renovar_membresia_con_pago';
