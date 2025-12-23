-- Tabla de productos para gimnasio
CREATE TABLE `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text,
  `categoria` enum('suplementos','bebidas','snacks','accesorios','ropa') DEFAULT 'suplementos',
  `stock` int(11) NOT NULL DEFAULT 0,
  `stock_minimo` int(11) DEFAULT 5,
  `precio_compra` decimal(10,2) NOT NULL DEFAULT 0.00,
  `precio_venta` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categoria` (`categoria`),
  KEY `idx_estado` (`estado`),
  KEY `idx_stock` (`stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Datos de ejemplo
INSERT INTO `productos` (`nombre`, `descripcion`, `categoria`, `stock`, `stock_minimo`, `precio_compra`, `precio_venta`) VALUES
('Proteína Whey 1kg', 'Proteína en polvo sabor vainilla', 'suplementos', 15, 5, 25.00, 45.00),
('Creatina 300g', 'Creatina monohidrato pura', 'suplementos', 20, 3, 15.00, 28.00),
('Gatorade 500ml', 'Bebida isotónica', 'bebidas', 50, 10, 1.50, 3.00),
('Barra Proteica', 'Barra de proteína sabor chocolate', 'snacks', 30, 8, 2.00, 4.50),
('Guantes Gym', 'Guantes para entrenamiento', 'accesorios', 12, 3, 8.00, 18.00),
('Camiseta Gym', 'Camiseta deportiva', 'ropa', 25, 5, 12.00, 25.00);

-- Tabla de ventas
CREATE TABLE `ventas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `metodo_pago` enum('efectivo','tarjeta','transferencia') DEFAULT 'efectivo',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuario_venta` (`usuario_id`),
  KEY `idx_producto_venta` (`producto_id`),
  KEY `idx_fecha` (`created_at`),
  CONSTRAINT `fk_venta_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_venta_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;