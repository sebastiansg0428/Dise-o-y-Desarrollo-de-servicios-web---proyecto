-- ==================================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS - SISTEMA DE GESTIÓN DE GIMNASIO
-- ==================================================================================
-- Nombre de la base de datos: meli
-- Fecha de creación: 8 de enero de 2026
-- Descripción: Sistema completo de gestión de gimnasio con usuarios, membresías,
--              pagos, productos, entrenadores, rutinas y ejercicios
-- ==================================================================================
-- 
-- INSTRUCCIONES PREVIAS:
-- Antes de ejecutar este script, asegúrate de:
-- 1. Crear la base de datos manualmente: CREATE DATABASE meli;
-- 2. Seleccionar la base de datos: USE meli;
-- 3. Luego ejecutar este script completo
-- 
-- O ejecuta primero estas dos líneas por separado:
--   CREATE DATABASE IF NOT EXISTS `meli` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
--   USE `meli`;
-- ==================================================================================

-- ==================================================================================
-- TABLA: usuarios
-- ==================================================================================
-- Descripción: Almacena la información de los clientes del gimnasio
-- ==================================================================================

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `apellido` varchar(150) DEFAULT NULL,
  `email` varchar(120) NOT NULL,
  `password` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `genero` enum('M','F','Otro') DEFAULT NULL,
  `membresia` enum('basica','premium','vip') DEFAULT 'basica',
  `estado` enum('activo','inactivo','suspendido') DEFAULT 'activo',
  `fecha_inicio_membresia` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `precio_membresia` decimal(8,2) DEFAULT 0.00,
  `ultima_visita` datetime DEFAULT NULL,
  `total_visitas` int(11) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_estado` (`estado`),
  KEY `idx_membresia` (`membresia`),
  KEY `idx_fecha_vencimiento` (`fecha_vencimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: entrenadores
-- ==================================================================================
-- Descripción: Almacena la información de los entrenadores del gimnasio
-- ==================================================================================

CREATE TABLE `entrenadores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `apellido` varchar(150) DEFAULT NULL,
  `email` varchar(120) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `genero` enum('M','F','Otro') DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `especialidad_principal` enum('fuerza','hipertrofia','resistencia','cardio','funcional','rehabilitacion','crossfit','yoga','pilates') DEFAULT 'fuerza',
  `experiencia_anios` int(11) DEFAULT 0,
  `certificaciones` text,
  `biografia` text,
  `tarifa_rutina` decimal(10,2) DEFAULT 0.00,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_unico_entrenador` (`email`),
  KEY `idx_especialidad` (`especialidad_principal`),
  KEY `idx_estado_entrenador` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: entrenadores_horarios
-- ==================================================================================
-- Descripción: Horarios de disponibilidad de los entrenadores
-- ==================================================================================

CREATE TABLE `entrenadores_horarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entrenador_id` int(11) NOT NULL,
  `dia_semana` enum('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `disponible` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entrenador_dia` (`entrenador_id`,`dia_semana`),
  CONSTRAINT `fk_hor_entrenador` FOREIGN KEY (`entrenador_id`) REFERENCES `entrenadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: entrenadores_clientes
-- ==================================================================================
-- Descripción: Asignación de clientes a entrenadores
-- ==================================================================================

CREATE TABLE `entrenadores_clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entrenador_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_asignacion` date DEFAULT NULL,
  `estado` enum('activo','pausado','finalizado') DEFAULT 'activo',
  `notas` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_entrenador_cliente` (`entrenador_id`,`usuario_id`),
  KEY `idx_estado_cli` (`estado`),
  CONSTRAINT `fk_ec_entrenador` FOREIGN KEY (`entrenador_id`) REFERENCES `entrenadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ec_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: ejercicios
-- ==================================================================================
-- Descripción: Catálogo de ejercicios disponibles
-- ==================================================================================

CREATE TABLE `ejercicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text,
  `grupo_muscular` enum('pecho','espalda','hombros','biceps','triceps','piernas','gluteos','abdomen','cardio','funcional') NOT NULL,
  `tipo` enum('fuerza','cardio','flexibilidad','funcional') DEFAULT 'fuerza',
  `nivel` enum('principiante','intermedio','avanzado') DEFAULT 'principiante',
  `equipo` varchar(200) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `calorias_x_minuto` decimal(5,2) DEFAULT 5.00,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grupo_muscular` (`grupo_muscular`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_nivel` (`nivel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: rutinas
-- ==================================================================================
-- Descripción: Rutinas de entrenamiento (públicas y personalizadas)
-- ==================================================================================

CREATE TABLE `rutinas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text,
  `objetivo` enum('fuerza','resistencia','hipertrofia','perdida_peso','tonificacion','funcional') DEFAULT 'tonificacion',
  `nivel` enum('principiante','intermedio','avanzado') DEFAULT 'principiante',
  `duracion_estimada` int(11) DEFAULT 60 COMMENT 'Duración en minutos',
  `frecuencia_semanal` int(11) DEFAULT 3 COMMENT 'Veces por semana recomendadas',
  `usuario_id` int(11) DEFAULT NULL COMMENT 'NULL si es rutina pública, ID si es personalizada',
  `tipo` enum('publica','personalizada') DEFAULT 'publica',
  `imagen_url` varchar(500) DEFAULT NULL,
  `popularidad` int(11) DEFAULT 0 COMMENT 'Contador de veces asignada',
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_objetivo` (`objetivo`),
  KEY `idx_nivel` (`nivel`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_tipo` (`tipo`),
  CONSTRAINT `fk_rutina_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: rutinas_ejercicios
-- ==================================================================================
-- Descripción: Relación entre rutinas y ejercicios
-- ==================================================================================

CREATE TABLE `rutinas_ejercicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rutina_id` int(11) NOT NULL,
  `ejercicio_id` int(11) NOT NULL,
  `orden` int(11) NOT NULL DEFAULT 1,
  `series` int(11) NOT NULL DEFAULT 3,
  `repeticiones` varchar(50) DEFAULT '12' COMMENT 'Puede ser número o rango: 10-12',
  `descanso` int(11) DEFAULT 60 COMMENT 'Descanso en segundos entre series',
  `peso_sugerido` varchar(50) DEFAULT NULL COMMENT 'Peso sugerido o %RM',
  `notas` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rutina_ejercicio_orden` (`rutina_id`,`ejercicio_id`,`orden`),
  KEY `idx_rutina` (`rutina_id`),
  KEY `idx_ejercicio` (`ejercicio_id`),
  CONSTRAINT `fk_re_rutina` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_re_ejercicio` FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: usuarios_rutinas
-- ==================================================================================
-- Descripción: Asignación de rutinas a usuarios
-- ==================================================================================

CREATE TABLE `usuarios_rutinas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `rutina_id` int(11) NOT NULL,
  `fecha_asignacion` date DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` enum('asignada','en_progreso','completada','cancelada') DEFAULT 'asignada',
  `progreso` decimal(5,2) DEFAULT 0.00 COMMENT 'Porcentaje de completitud',
  `notas` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuario_rutina` (`usuario_id`,`rutina_id`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_rutina` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: sesiones_entrenamiento
-- ==================================================================================
-- Descripción: Sesiones de entrenamiento programadas
-- ==================================================================================

CREATE TABLE `sesiones_entrenamiento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entrenador_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `rutina_id` int(11) DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `duracion_minutos` int(11) DEFAULT 60,
  `tipo` enum('personal','grupo','evaluacion') DEFAULT 'personal',
  `ubicacion` varchar(200) DEFAULT 'gimnasio',
  `estado` enum('programada','en_progreso','completada','cancelada') DEFAULT 'programada',
  `calorias_estimadas` decimal(8,2) DEFAULT NULL,
  `notas` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entrenador_sesion` (`entrenador_id`),
  KEY `idx_usuario_sesion` (`usuario_id`),
  KEY `idx_fecha_sesion` (`fecha`),
  CONSTRAINT `fk_se_entrenador` FOREIGN KEY (`entrenador_id`) REFERENCES `entrenadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_se_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_se_rutina` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: valoraciones_entrenadores
-- ==================================================================================
-- Descripción: Valoraciones y comentarios de los clientes sobre los entrenadores
-- ==================================================================================

CREATE TABLE `valoraciones_entrenadores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entrenador_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `puntuacion` int(11) NOT NULL CHECK (`puntuacion` BETWEEN 1 AND 5),
  `comentario` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entrenador_val` (`entrenador_id`),
  KEY `idx_usuario_val` (`usuario_id`),
  CONSTRAINT `fk_val_entrenador` FOREIGN KEY (`entrenador_id`) REFERENCES `entrenadores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_val_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================================================================================
-- TABLA: productos
-- ==================================================================================
-- Descripción: Productos disponibles para la venta (suplementos, bebidas, etc.)
-- ==================================================================================

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

-- ==================================================================================
-- TABLA: ventas
-- ==================================================================================
-- Descripción: Registro de ventas de productos
-- ==================================================================================

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

-- ==================================================================================
-- TABLA: pagos
-- ==================================================================================
-- Descripción: Sistema de pagos (membresías, productos, sesiones)
-- ==================================================================================

CREATE TABLE `pagos` (
    `id` int(11) PRIMARY KEY AUTO_INCREMENT,
    `usuario_id` int(11) NOT NULL,
    `tipo_pago` enum('membresia', 'producto', 'sesion', 'otro') NOT NULL DEFAULT 'membresia',
    `concepto` varchar(255) NOT NULL,
    `monto` decimal(10,2) NOT NULL,
    `metodo_pago` enum('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata') NOT NULL DEFAULT 'efectivo',
    `estado` enum('pendiente', 'pagado', 'cancelado', 'reembolsado') NOT NULL DEFAULT 'pendiente',
    `fecha_vencimiento` date NULL,
    `fecha_pago` datetime NULL,
    `comprobante` varchar(500) NULL COMMENT 'URL o número de comprobante',
    `notas` text NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pago_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
    KEY `idx_usuario` (`usuario_id`),
    KEY `idx_estado` (`estado`),
    KEY `idx_tipo` (`tipo_pago`),
    KEY `idx_fecha` (`fecha_pago`),
    KEY `idx_metodo` (`metodo_pago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================================================
-- TABLA: facturas
-- ==================================================================================
-- Descripción: Facturas emitidas
-- ==================================================================================

CREATE TABLE `facturas` (
    `id` int(11) PRIMARY KEY AUTO_INCREMENT,
    `numero_factura` varchar(50) UNIQUE NOT NULL,
    `pago_id` int(11) NULL,
    `usuario_id` int(11) NOT NULL,
    `subtotal` decimal(10,2) NOT NULL,
    `impuesto` decimal(10,2) DEFAULT 0.00,
    `descuento` decimal(10,2) DEFAULT 0.00,
    `total` decimal(10,2) NOT NULL,
    `estado` enum('borrador', 'emitida', 'pagada', 'anulada') NOT NULL DEFAULT 'emitida',
    `fecha_emision` datetime DEFAULT CURRENT_TIMESTAMP,
    `fecha_vencimiento` date NULL,
    `notas` text NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_factura_pago` FOREIGN KEY (`pago_id`) REFERENCES `pagos`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_factura_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
    KEY `idx_numero` (`numero_factura`),
    KEY `idx_usuario` (`usuario_id`),
    KEY `idx_estado` (`estado`),
    KEY `idx_fecha` (`fecha_emision`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================================================
-- TABLA: facturas_detalles
-- ==================================================================================
-- Descripción: Detalles de las facturas
-- ==================================================================================

CREATE TABLE `facturas_detalles` (
    `id` int(11) PRIMARY KEY AUTO_INCREMENT,
    `factura_id` int(11) NOT NULL,
    `descripcion` varchar(255) NOT NULL,
    `cantidad` int(11) NOT NULL DEFAULT 1,
    `precio_unitario` decimal(10,2) NOT NULL,
    `subtotal` decimal(10,2) NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_detalle_factura` FOREIGN KEY (`factura_id`) REFERENCES `facturas`(`id`) ON DELETE CASCADE,
    KEY `idx_factura` (`factura_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================================================
-- TABLA: membresias_pagos
-- ==================================================================================
-- Descripción: Historial de pagos de membresías
-- ==================================================================================

CREATE TABLE `membresias_pagos` (
    `id` int(11) PRIMARY KEY AUTO_INCREMENT,
    `usuario_id` int(11) NOT NULL,
    `pago_id` int(11) NOT NULL,
    `tipo_membresia` enum('basica', 'premium', 'vip') NOT NULL,
    `monto` decimal(10,2) NOT NULL,
    `fecha_inicio` date NOT NULL,
    `fecha_fin` date NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_membresia_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_membresia_pago` FOREIGN KEY (`pago_id`) REFERENCES `pagos`(`id`) ON DELETE CASCADE,
    KEY `idx_usuario` (`usuario_id`),
    KEY `idx_fechas` (`fecha_inicio`, `fecha_fin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================================================
-- VISTAS
-- ==================================================================================

-- Vista de pagos con información del usuario
CREATE OR REPLACE VIEW `v_pagos_completos` AS
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
CREATE OR REPLACE VIEW `v_facturas_completas` AS
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

-- ==================================================================================
-- DATOS DE EJEMPLO
-- ==================================================================================

-- Insertar usuarios de ejemplo
INSERT INTO `usuarios` (`nombre`, `apellido`, `email`, `password`, `telefono`, `membresia`, `estado`, `precio_membresia`, `fecha_inicio_membresia`, `fecha_vencimiento`, `ultima_visita`, `total_visitas`) VALUES
('Sebastián', 'García', 'sebastiansg0428@gmail.com', '123456', '555-0001', 'premium', 'activo', 50000.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 15),
('Admin', 'Sistema', 'admin@gmail.com', '123456', '555-0002', 'vip', 'activo', 80000.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 25),
('María', 'López', 'maria@gmail.com', '123456', '555-0003', 'basica', 'activo', 30000.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 8),
('Carlos', 'Rodríguez', 'carlos@gmail.com', '123456', '555-0004', 'premium', 'activo', 50000.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 12),
('Ana', 'Martínez', 'ana@gmail.com', '123456', '555-0005', 'basica', 'activo', 30000.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 5);

-- Insertar entrenadores de ejemplo
INSERT INTO `entrenadores` (`nombre`, `apellido`, `email`, `telefono`, `genero`, `especialidad_principal`, `experiencia_anios`, `certificaciones`, `biografia`, `tarifa_rutina`) VALUES
('Luis', 'Pérez', 'luis.perez@gym.com', '555-1001', 'M', 'fuerza', 6, 'NASM-CPT, Crossfit L1', 'Entrenador enfocado en fuerza y técnica.', 20000.00),
('Carla', 'Suárez', 'carla.suarez@gym.com', '555-1002', 'F', 'hipertrofia', 4, 'ACE-CPT', 'Especialista en hipertrofia y recomposición corporal.', 18000.00),
('Diego', 'Ramírez', 'diego.ramirez@gym.com', '555-1003', 'M', 'funcional', 8, 'NSCA-CSCS', 'Entrenamientos funcionales y prevención de lesiones.', 22500.00);

-- Insertar horarios de entrenadores
INSERT INTO `entrenadores_horarios` (`entrenador_id`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
(1, 'lunes', '09:00:00', '12:00:00'),
(1, 'miercoles', '16:00:00', '20:00:00'),
(2, 'martes', '10:00:00', '14:00:00'),
(2, 'jueves', '15:00:00', '19:00:00'),
(3, 'viernes', '08:00:00', '12:00:00');

-- Asignar clientes a entrenadores
INSERT INTO `entrenadores_clientes` (`entrenador_id`, `usuario_id`, `estado`) VALUES
(1, 1, 'activo'),
(2, 2, 'activo');

-- Insertar productos
INSERT INTO `productos` (`nombre`, `descripcion`, `categoria`, `stock`, `stock_minimo`, `precio_compra`, `precio_venta`) VALUES
('Proteína Whey 1kg', 'Proteína en polvo sabor vainilla', 'suplementos', 15, 5, 80000.00, 120000.00),
('Creatina 300g', 'Creatina monohidrato pura', 'suplementos', 20, 3, 40000.00, 65000.00),
('Gatorade 500ml', 'Bebida isotónica', 'bebidas', 50, 10, 2000.00, 4000.00),
('Barra Proteica', 'Barra de proteína sabor chocolate', 'snacks', 30, 8, 3000.00, 6000.00),
('Guantes Gym', 'Guantes para entrenamiento', 'accesorios', 12, 3, 25000.00, 45000.00),
('Camiseta Gym', 'Camiseta deportiva', 'ropa', 25, 5, 35000.00, 60000.00);

-- Insertar ejercicios
INSERT INTO `ejercicios` (`nombre`, `descripcion`, `grupo_muscular`, `tipo`, `nivel`, `equipo`, `calorias_x_minuto`) VALUES
-- PECHO
('Press de Banca', 'Ejercicio compuesto para pecho, hombros y tríceps', 'pecho', 'fuerza', 'intermedio', 'Barra, banco plano', 6.5),
('Press Inclinado con Mancuernas', 'Trabaja pecho superior', 'pecho', 'fuerza', 'intermedio', 'Mancuernas, banco inclinado', 6.0),
('Aperturas con Mancuernas', 'Aislamiento de pecho', 'pecho', 'fuerza', 'principiante', 'Mancuernas, banco', 5.5),
('Flexiones', 'Ejercicio con peso corporal', 'pecho', 'fuerza', 'principiante', 'Ninguno', 5.0),
-- ESPALDA
('Dominadas', 'Ejercicio compuesto para espalda', 'espalda', 'fuerza', 'intermedio', 'Barra de dominadas', 7.0),
('Remo con Barra', 'Ejercicio compuesto para espalda media', 'espalda', 'fuerza', 'intermedio', 'Barra', 6.5),
('Jalón al Pecho', 'Trabajo de dorsales', 'espalda', 'fuerza', 'principiante', 'Polea alta', 5.5),
('Peso Muerto', 'Ejercicio compuesto completo', 'espalda', 'fuerza', 'avanzado', 'Barra', 8.0),
-- PIERNAS
('Sentadilla', 'Ejercicio compuesto de piernas', 'piernas', 'fuerza', 'intermedio', 'Barra, rack', 7.5),
('Prensa de Piernas', 'Cuádriceps, glúteos', 'piernas', 'fuerza', 'principiante', 'Máquina prensa', 6.0),
('Zancadas', 'Ejercicio unilateral de piernas', 'piernas', 'fuerza', 'intermedio', 'Mancuernas', 6.5),
('Curl de Femoral', 'Aislamiento de femorales', 'piernas', 'fuerza', 'principiante', 'Máquina curl', 4.5),
('Extensión de Cuádriceps', 'Aislamiento de cuádriceps', 'piernas', 'fuerza', 'principiante', 'Máquina extensión', 4.5),
-- HOMBROS
('Press Militar', 'Ejercicio compuesto de hombros', 'hombros', 'fuerza', 'intermedio', 'Barra', 6.0),
('Elevaciones Laterales', 'Aislamiento de hombro medio', 'hombros', 'fuerza', 'principiante', 'Mancuernas', 4.5),
('Elevaciones Frontales', 'Hombro anterior', 'hombros', 'fuerza', 'principiante', 'Mancuernas', 4.5),
('Remo al Mentón', 'Hombros y trapecios', 'hombros', 'fuerza', 'intermedio', 'Barra o mancuernas', 5.5),
-- BRAZOS
('Curl de Bíceps con Barra', 'Ejercicio básico de bíceps', 'biceps', 'fuerza', 'principiante', 'Barra', 4.0),
('Curl Martillo', 'Bíceps y antebrazo', 'biceps', 'fuerza', 'principiante', 'Mancuernas', 4.0),
('Press Francés', 'Tríceps', 'triceps', 'fuerza', 'intermedio', 'Barra, banco', 5.0),
('Fondos en Paralelas', 'Tríceps y pecho', 'triceps', 'fuerza', 'intermedio', 'Paralelas', 6.0),
('Extensión de Tríceps en Polea', 'Aislamiento de tríceps', 'triceps', 'fuerza', 'principiante', 'Polea', 4.5),
-- ABDOMEN
('Crunch Abdominal', 'Ejercicio básico de abdomen', 'abdomen', 'fuerza', 'principiante', 'Colchoneta', 4.0),
('Plancha', 'Isométrico de core', 'abdomen', 'fuerza', 'principiante', 'Colchoneta', 5.0),
('Elevación de Piernas', 'Abdomen inferior', 'abdomen', 'fuerza', 'intermedio', 'Barra o banco', 5.5),
('Russian Twist', 'Oblicuos y core', 'abdomen', 'fuerza', 'intermedio', 'Disco o balón medicinal', 5.0),
-- CARDIO
('Caminadora', 'Cardio de bajo impacto', 'cardio', 'cardio', 'principiante', 'Caminadora', 8.0),
('Bicicleta Estática', 'Cardio para piernas', 'cardio', 'cardio', 'principiante', 'Bicicleta', 7.0),
('Elíptica', 'Cardio de bajo impacto', 'cardio', 'cardio', 'principiante', 'Elíptica', 8.5),
('Burpees', 'Ejercicio funcional intenso', 'cardio', 'funcional', 'avanzado', 'Ninguno', 10.0),
('Saltar la Cuerda', 'Cardio intenso', 'cardio', 'cardio', 'intermedio', 'Cuerda', 11.0);

-- Insertar rutinas
INSERT INTO `rutinas` (`nombre`, `descripcion`, `objetivo`, `nivel`, `duracion_estimada`, `frecuencia_semanal`, `tipo`) VALUES
('Full Body Principiante', 'Rutina completa para todo el cuerpo, ideal para empezar', 'tonificacion', 'principiante', 60, 3, 'publica'),
('Fuerza Upper Body', 'Rutina enfocada en tren superior', 'fuerza', 'intermedio', 75, 4, 'publica'),
('Fuerza Lower Body', 'Rutina enfocada en tren inferior', 'fuerza', 'intermedio', 70, 3, 'publica'),
('Hipertrofia Push', 'Rutina push para ganancia muscular', 'hipertrofia', 'avanzado', 90, 2, 'publica'),
('Hipertrofia Pull', 'Rutina pull para ganancia muscular', 'hipertrofia', 'avanzado', 90, 2, 'publica'),
('Cardio + Tonificación', 'Combina cardio con ejercicios de fuerza', 'perdida_peso', 'principiante', 50, 5, 'publica'),
('HIIT Intenso', 'Entrenamiento de alta intensidad', 'perdida_peso', 'avanzado', 45, 4, 'publica');

-- Asignar ejercicios a rutinas
-- RUTINA 1: Full Body Principiante
INSERT INTO `rutinas_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones`, `descanso`, `notas`) VALUES
(1, 4, 1, 3, '10-12', 60, 'Mantén el core activado'),
(1, 7, 2, 3, '10-12', 90, 'Espalda recta durante el ejercicio'),
(1, 10, 3, 3, '12-15', 90, 'Controla la bajada'),
(1, 17, 4, 3, '12-15', 60, 'No balancear el cuerpo'),
(1, 22, 5, 3, '15-20', 60, 'Aprieta en la contracción'),
(1, 24, 6, 3, '30-45 seg', 45, 'Mantén posición neutral');

-- RUTINA 2: Fuerza Upper Body
INSERT INTO `rutinas_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones`, `descanso`, `peso_sugerido`) VALUES
(2, 1, 1, 4, '6-8', 120, '70-80% 1RM'),
(2, 6, 2, 4, '6-8', 120, '70-80% 1RM'),
(2, 14, 3, 3, '8-10', 90, '65-75% 1RM'),
(2, 18, 4, 3, '8-10', 90, NULL),
(2, 19, 5, 3, '10-12', 60, NULL),
(2, 21, 6, 3, '10-12', 60, NULL);

-- RUTINA 3: Fuerza Lower Body
INSERT INTO `rutinas_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones`, `descanso`, `peso_sugerido`) VALUES
(3, 9, 1, 4, '6-8', 150, '75-85% 1RM'),
(3, 8, 2, 3, '6-8', 120, '70-80% 1RM'),
(3, 11, 3, 3, '10-12', 90, NULL),
(3, 12, 4, 3, '12-15', 60, NULL),
(3, 13, 5, 3, '12-15', 60, NULL),
(3, 25, 6, 3, '20-30', 45, 'Abdomen bajo');

-- RUTINA 4: Hipertrofia Push
INSERT INTO `rutinas_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones`, `descanso`) VALUES
(4, 1, 1, 4, '8-12', 90),
(4, 2, 2, 4, '10-12', 75),
(4, 3, 3, 3, '12-15', 60),
(4, 14, 4, 4, '8-10', 90),
(4, 15, 5, 3, '12-15', 60),
(4, 19, 6, 3, '10-12', 75),
(4, 21, 7, 3, '12-15', 60);

-- RUTINA 5: Hipertrofia Pull
INSERT INTO `rutinas_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones`, `descanso`) VALUES
(5, 5, 1, 4, '6-10', 120),
(5, 6, 2, 4, '8-12', 90),
(5, 7, 3, 3, '10-12', 75),
(5, 8, 4, 3, '6-8', 120),
(5, 17, 5, 4, '10-12', 60),
(5, 18, 6, 3, '10-12', 60),
(5, 26, 7, 3, '15-20', 45);

-- RUTINA 6: Cardio + Tonificación
INSERT INTO `rutinas_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones`, `descanso`) VALUES
(6, 27, 1, 1, '10 min', 0, 'Ritmo moderado'),
(6, 4, 2, 3, '15-20', 45, NULL),
(6, 10, 3, 3, '15-20', 45, NULL),
(6, 22, 4, 3, '20', 45, NULL),
(6, 24, 5, 3, '45 seg', 30, NULL),
(6, 28, 6, 1, '10 min', 0, 'Ritmo moderado');

-- RUTINA 7: HIIT Intenso
INSERT INTO `rutinas_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones`, `descanso`, `notas`) VALUES
(7, 30, 1, 4, '12-15', 30, 'Máxima velocidad'),
(7, 31, 2, 4, '1 min', 30, 'Alta intensidad'),
(7, 4, 3, 4, '20', 30, 'Explosivas'),
(7, 11, 4, 4, '15-20', 30, 'Alternadas'),
(7, 26, 5, 4, '30-40', 30, 'Máxima velocidad');

-- Insertar sesiones de entrenamiento
INSERT INTO `sesiones_entrenamiento` (`entrenador_id`, `usuario_id`, `rutina_id`, `fecha`, `duracion_minutos`, `tipo`, `ubicacion`, `estado`, `notas`) VALUES
(1, 1, 1, DATE_ADD(NOW(), INTERVAL 1 DAY), 60, 'personal', 'gimnasio', 'programada', 'Evaluar técnica en sentadilla'),
(2, 2, 2, DATE_ADD(NOW(), INTERVAL 2 DAY), 75, 'personal', 'gimnasio', 'programada', 'Push day hipertrofia');

-- Insertar valoraciones
INSERT INTO `valoraciones_entrenadores` (`entrenador_id`, `usuario_id`, `puntuacion`, `comentario`) VALUES
(1, 1, 5, 'Excelente atención y técnica'),
(2, 2, 4, 'Muy buena sesión, volveré a entrenar con Carla');

-- Insertar pagos
INSERT INTO `pagos` (`usuario_id`, `tipo_pago`, `concepto`, `monto`, `metodo_pago`, `estado`, `fecha_pago`) VALUES
(1, 'membresia', 'Membresía Premium - Enero 2026', 50000.00, 'tarjeta', 'pagado', NOW()),
(2, 'membresia', 'Membresía Básica - Enero 2026', 30000.00, 'efectivo', 'pagado', NOW()),
(3, 'sesion', 'Sesión de entrenamiento personalizado', 50000.00, 'transferencia', 'pagado', NOW()),
(4, 'membresia', 'Membresía VIP - Enero 2026', 80000.00, 'nequi', 'pendiente', NULL);

-- Insertar facturas
INSERT INTO `facturas` (`numero_factura`, `pago_id`, `usuario_id`, `subtotal`, `impuesto`, `descuento`, `total`, `estado`) VALUES
('FAC-2026-0001', 1, 1, 50000.00, 9500.00, 0.00, 59500.00, 'pagada'),
('FAC-2026-0002', 2, 2, 30000.00, 5700.00, 0.00, 35700.00, 'pagada'),
('FAC-2026-0003', 3, 3, 50000.00, 9500.00, 5000.00, 54500.00, 'pagada'),
('FAC-2026-0004', 4, 4, 80000.00, 15200.00, 0.00, 95200.00, 'emitida');

-- Insertar detalles de facturas
INSERT INTO `facturas_detalles` (`factura_id`, `descripcion`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 'Membresía Premium - 1 mes', 1, 50000.00, 50000.00),
(2, 'Membresía Básica - 1 mes', 1, 30000.00, 30000.00),
(3, 'Sesión de entrenamiento personalizado', 1, 50000.00, 50000.00),
(4, 'Membresía VIP - 1 mes', 1, 80000.00, 80000.00);

-- ==================================================================================
-- FIN DEL SCRIPT
-- ==================================================================================

-- ==================================================================================
-- NOTAS DE IMPORTACIÓN
-- ==================================================================================
-- Para importar este script en otro servidor:
-- 1. Crear una nueva conexión a la base de datos
-- 2. Ejecutar este script completo
-- 3. Verificar que todas las tablas se hayan creado correctamente
-- 4. Verificar que los datos de ejemplo se hayan insertado
-- 5. Actualizar el archivo index.js con las credenciales de la nueva base de datos
-- ==================================================================================
