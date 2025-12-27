-- ==================== SISTEMA DE PAGOS ====================

-- Tabla de pagos (membresías, productos, sesiones)
CREATE TABLE IF NOT EXISTS pagos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo_pago ENUM('membresia', 'producto', 'sesion', 'otro') NOT NULL DEFAULT 'membresia',
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata') NOT NULL DEFAULT 'efectivo',
    estado ENUM('pendiente', 'pagado', 'cancelado', 'reembolsado') NOT NULL DEFAULT 'pendiente',
    fecha_vencimiento DATE NULL,
    fecha_pago DATETIME NULL,
    comprobante VARCHAR(500) NULL COMMENT 'URL o número de comprobante',
    notas TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_estado (estado),
    INDEX idx_tipo (tipo_pago),
    INDEX idx_fecha (fecha_pago),
    INDEX idx_metodo (metodo_pago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de facturas
CREATE TABLE IF NOT EXISTS facturas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    pago_id INT NULL,
    usuario_id INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    impuesto DECIMAL(10,2) DEFAULT 0.00,
    descuento DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    estado ENUM('borrador', 'emitida', 'pagada', 'anulada') NOT NULL DEFAULT 'emitida',
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE NULL,
    notas TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_numero (numero_factura),
    INDEX idx_usuario (usuario_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha (fecha_emision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de detalles de factura
CREATE TABLE IF NOT EXISTS facturas_detalles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    factura_id INT NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    INDEX idx_factura (factura_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de historial de pagos de membresías
CREATE TABLE IF NOT EXISTS membresias_pagos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    pago_id INT NOT NULL,
    tipo_membresia ENUM('basica', 'premium', 'vip') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_fechas (fecha_inicio, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DATOS DE EJEMPLO ====================

-- Pagos de ejemplo
INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, estado, fecha_pago) VALUES
(1, 'membresia', 'Membresía Premium - Enero 2025', 50000.00, 'tarjeta', 'pagado', NOW()),
(2, 'membresia', 'Membresía Básica - Enero 2025', 30000.00, 'efectivo', 'pagado', NOW()),
(3, 'sesion', 'Sesión de entrenamiento personalizado', 50000.00, 'transferencia', 'pagado', NOW()),
(4, 'membresia', 'Membresía VIP - Enero 2025', 80000.00, 'nequi', 'pendiente', NULL);

-- Facturas de ejemplo
INSERT INTO facturas (numero_factura, pago_id, usuario_id, subtotal, impuesto, descuento, total, estado) VALUES
('FAC-2025-0001', 1, 1, 50000.00, 9500.00, 0.00, 59500.00, 'pagada'),
('FAC-2025-0002', 2, 2, 30000.00, 5700.00, 0.00, 35700.00, 'pagada'),
('FAC-2025-0003', 3, 3, 50000.00, 9500.00, 5000.00, 54500.00, 'pagada'),
('FAC-2025-0004', 4, 4, 80000.00, 15200.00, 0.00, 95200.00, 'emitida');

-- Detalles de facturas
INSERT INTO facturas_detalles (factura_id, descripcion, cantidad, precio_unitario, subtotal) VALUES
(1, 'Membresía Premium - 1 mes', 1, 50000.00, 50000.00),
(2, 'Membresía Básica - 1 mes', 1, 30000.00, 30000.00),
(3, 'Sesión de entrenamiento personalizado', 1, 50000.00, 50000.00),
(4, 'Membresía VIP - 1 mes', 1, 80000.00, 80000.00);

-- ==================== VISTAS ÚTILES ====================

-- Vista de pagos con información del usuario
CREATE OR REPLACE VIEW v_pagos_completos AS
SELECT 
    p.id,
    p.tipo_pago,
    p.concepto,
    p.monto,
    p.metodo_pago,
    p.estado,
    p.fecha_vencimiento,
    p.fecha_pago,
    p.comprobante,
    DATE_FORMAT(p.created_at, '%d/%m/%Y %H:%i') as fecha_registro,
    u.id as usuario_id,
    u.nombre as usuario_nombre,
    u.apellido as usuario_apellido,
    u.email as usuario_email,
    u.membresia as tipo_membresia_actual,
    CASE 
        WHEN p.estado = 'pendiente' AND p.fecha_vencimiento < CURDATE() THEN 'vencido'
        WHEN p.estado = 'pendiente' THEN 'por_vencer'
        ELSE p.estado
    END as estado_real
FROM pagos p
INNER JOIN usuarios u ON p.usuario_id = u.id;

-- Vista de facturas completas
CREATE OR REPLACE VIEW v_facturas_completas AS
SELECT 
    f.id,
    f.numero_factura,
    f.usuario_id,
    u.nombre as usuario_nombre,
    u.apellido as usuario_apellido,
    u.email as usuario_email,
    f.subtotal,
    f.impuesto,
    f.descuento,
    f.total,
    f.estado,
    DATE_FORMAT(f.fecha_emision, '%d/%m/%Y') as fecha_emision,
    DATE_FORMAT(f.fecha_vencimiento, '%d/%m/%Y') as fecha_vencimiento,
    f.pago_id,
    p.metodo_pago,
    p.fecha_pago,
    COUNT(fd.id) as total_items
FROM facturas f
INNER JOIN usuarios u ON f.usuario_id = u.id
LEFT JOIN pagos p ON f.pago_id = p.id
LEFT JOIN facturas_detalles fd ON f.id = fd.factura_id
GROUP BY f.id;

-- ==================== PROCEDIMIENTOS ALMACENADOS ====================

DELIMITER //

-- Procedimiento para renovar membresía con pago
CREATE PROCEDURE sp_renovar_membresia_con_pago(
    IN p_usuario_id INT,
    IN p_tipo_membresia ENUM('basica', 'premium', 'vip'),
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
    
    -- Determinar monto según tipo de membresía
    SET v_monto = CASE p_tipo_membresia
        WHEN 'basica' THEN 30000.00
        WHEN 'premium' THEN 50000.00
        WHEN 'vip' THEN 80000.00
    END;
    
    -- Calcular impuesto (19% IVA en Colombia)
    SET v_impuesto = v_monto * 0.19;
    SET v_total = v_monto + v_impuesto;
    
    -- Fechas de vigencia
    SET v_fecha_inicio = CURDATE();
    SET v_fecha_fin = DATE_ADD(CURDATE(), INTERVAL 1 MONTH);
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Crear pago
    INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, estado, fecha_pago, comprobante)
    VALUES (p_usuario_id, 'membresia', CONCAT('Membresía ', UPPER(p_tipo_membresia), ' - ', DATE_FORMAT(NOW(), '%M %Y')), 
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
    VALUES (v_factura_id, CONCAT('Membresía ', UPPER(p_tipo_membresia), ' - 1 mes'), 1, v_monto, v_monto);
    
    -- Registrar en historial de membresías
    INSERT INTO membresias_pagos (usuario_id, pago_id, tipo_membresia, monto, fecha_inicio, fecha_fin)
    VALUES (p_usuario_id, p_pago_id, p_tipo_membresia, v_total, v_fecha_inicio, v_fecha_fin);
    
    -- Actualizar usuario
    UPDATE usuarios 
    SET membresia = p_tipo_membresia,
        precio_membresia = v_monto,
        fecha_vencimiento = v_fecha_fin,
        updated_at = NOW()
    WHERE id = p_usuario_id;
    
    COMMIT;
END //

DELIMITER ;

-- ==================== TRIGGERS ====================

DELIMITER //

-- Trigger para validar monto positivo
CREATE TRIGGER trg_validar_monto_pago BEFORE INSERT ON pagos
FOR EACH ROW
BEGIN
    IF NEW.monto <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto debe ser mayor a cero';
    END IF;
END //

-- Trigger para actualizar fecha de pago cuando cambia a pagado
CREATE TRIGGER trg_actualizar_fecha_pago BEFORE UPDATE ON pagos
FOR EACH ROW
BEGIN
    IF NEW.estado = 'pagado' AND OLD.estado != 'pagado' AND NEW.fecha_pago IS NULL THEN
        SET NEW.fecha_pago = NOW();
    END IF;
END //

DELIMITER ;

-- ==================== ÍNDICES ADICIONALES ====================

-- Índices compuestos para consultas frecuentes
ALTER TABLE pagos ADD INDEX idx_usuario_estado (usuario_id, estado);
ALTER TABLE pagos ADD INDEX idx_tipo_estado (tipo_pago, estado);
ALTER TABLE facturas ADD INDEX idx_usuario_estado (usuario_id, estado);
