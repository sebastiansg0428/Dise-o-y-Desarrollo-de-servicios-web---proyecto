-- ============================================
-- SISTEMA DE ROLES Y PERMISOS (RBAC)
-- Role-Based Access Control
-- ============================================

-- IMPORTANTE: Si las tablas YA EXISTEN, ejecuta primero PASO1_LIMPIAR.sql
-- Este script creará las tablas desde cero

-- 1. TABLA DE ROLES
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL UNIQUE,
  `descripcion` TEXT,
  `nivel` INT(11) NOT NULL DEFAULT 1,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_nombre` (`nombre`),
  INDEX `idx_nivel` (`nivel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA DE PERMISOS
CREATE TABLE IF NOT EXISTS `permisos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL UNIQUE,
  `descripcion` TEXT,
  `recurso` VARCHAR(50) NOT NULL,
  `accion` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_recurso` (`recurso`),
  INDEX `idx_accion` (`accion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA RELACIONAL: USUARIOS - ROLES (muchos a muchos)
CREATE TABLE IF NOT EXISTS `usuarios_roles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` INT(11) NOT NULL,
  `rol_id` INT(11) NOT NULL,
  `asignado_por` INT(11),
  `fecha_asignacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_usuario_rol` (`usuario_id`, `rol_id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`asignado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  INDEX `idx_usuario` (`usuario_id`),
  INDEX `idx_rol` (`rol_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA RELACIONAL: ROLES - PERMISOS (muchos a muchos)
CREATE TABLE IF NOT EXISTS `roles_permisos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `rol_id` INT(11) NOT NULL,
  `permiso_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rol_permiso` (`rol_id`, `permiso_id`),
  FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permiso_id`) REFERENCES `permisos`(`id`) ON DELETE CASCADE,
  INDEX `idx_rol` (`rol_id`),
  INDEX `idx_permiso` (`permiso_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- INSERTAR ROLES BÁSICOS
INSERT INTO `roles` (`nombre`, `descripcion`, `nivel`, `activo`) VALUES
('admin', 'Administrador del sistema con acceso total', 100, 1),
('entrenador', 'Entrenador personal con gestión de clientes y rutinas', 50, 1),
('cliente', 'Cliente del gimnasio con acceso básico', 10, 1),
('recepcionista', 'Personal de recepción con acceso limitado', 30, 1)
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- INSERTAR PERMISOS POR RECURSO

-- Permisos de USUARIOS
INSERT INTO `permisos` (`nombre`, `descripcion`, `recurso`, `accion`) VALUES
('usuarios.listar', 'Listar todos los usuarios', 'usuarios', 'read'),
('usuarios.ver', 'Ver detalles de un usuario', 'usuarios', 'read'),
('usuarios.crear', 'Crear nuevos usuarios', 'usuarios', 'create'),
('usuarios.editar', 'Editar información de usuarios', 'usuarios', 'update'),
('usuarios.eliminar', 'Eliminar usuarios', 'usuarios', 'delete'),
('usuarios.cambiar_estado', 'Cambiar estado de usuarios', 'usuarios', 'update')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Permisos de PAGOS
INSERT INTO `permisos` (`nombre`, `descripcion`, `recurso`, `accion`) VALUES
('pagos.listar', 'Listar todos los pagos', 'pagos', 'read'),
('pagos.ver', 'Ver detalles de un pago', 'pagos', 'read'),
('pagos.crear', 'Registrar nuevos pagos', 'pagos', 'create'),
('pagos.editar', 'Editar información de pagos', 'pagos', 'update'),
('pagos.eliminar', 'Eliminar pagos', 'pagos', 'delete'),
('pagos.estadisticas', 'Ver estadísticas de pagos', 'pagos', 'read')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Permisos de PRODUCTOS
INSERT INTO `permisos` (`nombre`, `descripcion`, `recurso`, `accion`) VALUES
('productos.listar', 'Listar productos', 'productos', 'read'),
('productos.ver', 'Ver detalles de productos', 'productos', 'read'),
('productos.crear', 'Crear nuevos productos', 'productos', 'create'),
('productos.editar', 'Editar productos', 'productos', 'update'),
('productos.eliminar', 'Eliminar productos', 'productos', 'delete'),
('productos.vender', 'Vender productos', 'productos', 'create')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Permisos de RUTINAS
INSERT INTO `permisos` (`nombre`, `descripcion`, `recurso`, `accion`) VALUES
('rutinas.listar', 'Listar rutinas', 'rutinas', 'read'),
('rutinas.ver', 'Ver detalles de rutinas', 'rutinas', 'read'),
('rutinas.crear', 'Crear nuevas rutinas', 'rutinas', 'create'),
('rutinas.editar', 'Editar rutinas', 'rutinas', 'update'),
('rutinas.eliminar', 'Eliminar rutinas', 'rutinas', 'delete'),
('rutinas.asignar', 'Asignar rutinas a usuarios', 'rutinas', 'create')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Permisos de ENTRENADORES
INSERT INTO `permisos` (`nombre`, `descripcion`, `recurso`, `accion`) VALUES
('entrenadores.listar', 'Listar entrenadores', 'entrenadores', 'read'),
('entrenadores.ver', 'Ver detalles de entrenadores', 'entrenadores', 'read'),
('entrenadores.crear', 'Crear entrenadores', 'entrenadores', 'create'),
('entrenadores.editar', 'Editar entrenadores', 'entrenadores', 'update'),
('entrenadores.eliminar', 'Eliminar entrenadores', 'entrenadores', 'delete'),
('entrenadores.asignar_clientes', 'Asignar clientes a entrenadores', 'entrenadores', 'update')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Permisos de REPORTES
INSERT INTO `permisos` (`nombre`, `descripcion`, `recurso`, `accion`) VALUES
('reportes.ingresos', 'Ver reportes de ingresos', 'reportes', 'read'),
('reportes.usuarios', 'Ver reportes de usuarios', 'reportes', 'read'),
('reportes.general', 'Acceso a todos los reportes', 'reportes', 'read')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Permisos de DASHBOARD
INSERT INTO `permisos` (`nombre`, `descripcion`, `recurso`, `accion`) VALUES
('dashboard.ver', 'Ver dashboard principal', 'dashboard', 'read'),
('dashboard.estadisticas', 'Ver estadísticas del dashboard', 'dashboard', 'read')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- ============================================
-- ASIGNAR PERMISOS A ROLES
-- ============================================

-- ADMIN: Todos los permisos
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'admin'
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- ENTRENADOR: Permisos relacionados con su trabajo
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'entrenador'
AND p.nombre IN (
    'usuarios.listar',
    'usuarios.ver',
    'usuarios.editar',
    'rutinas.listar',
    'rutinas.ver',
    'rutinas.crear',
    'rutinas.editar',
    'rutinas.asignar',
    'entrenadores.ver',
    'entrenadores.asignar_clientes',
    'dashboard.ver',
    'pagos.ver',
    'pagos.listar'
)
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- CLIENTE: Permisos básicos de solo lectura
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'cliente'
AND p.nombre IN (
    'rutinas.ver',
    'rutinas.listar',
    'pagos.ver',
    'productos.listar',
    'productos.ver',
    'entrenadores.listar',
    'entrenadores.ver'
)
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- RECEPCIONISTA: Gestión básica y pagos
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'recepcionista'
AND p.nombre IN (
    'usuarios.listar',
    'usuarios.ver',
    'usuarios.crear',
    'usuarios.editar',
    'usuarios.cambiar_estado',
    'pagos.listar',
    'pagos.ver',
    'pagos.crear',
    'productos.listar',
    'productos.ver',
    'productos.vender',
    'dashboard.ver'
)
ON DUPLICATE KEY UPDATE rol_id = rol_id;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Usuarios con sus roles
CREATE OR REPLACE VIEW `vista_usuarios_roles` AS
SELECT 
    u.id AS usuario_id,
    u.nombre,
    u.apellido,
    u.email,
    r.nombre AS rol,
    r.nivel AS rol_nivel,
    ur.fecha_asignacion,
    ur.activo AS rol_activo
FROM usuarios u
LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id AND ur.activo = 1
LEFT JOIN roles r ON ur.rol_id = r.id
ORDER BY u.id, r.nivel DESC;

-- Vista: Roles con cantidad de usuarios
CREATE OR REPLACE VIEW `vista_roles_estadisticas` AS
SELECT 
    r.id,
    r.nombre,
    r.descripcion,
    r.nivel,
    COUNT(ur.usuario_id) AS total_usuarios,
    COUNT(CASE WHEN ur.activo = 1 THEN 1 END) AS usuarios_activos
FROM roles r
LEFT JOIN usuarios_roles ur ON r.id = ur.rol_id
GROUP BY r.id;

-- Vista: Permisos por rol
CREATE OR REPLACE VIEW `vista_roles_permisos` AS
SELECT 
    r.nombre AS rol,
    r.nivel,
    p.nombre AS permiso,
    p.recurso,
    p.accion,
    p.descripcion
FROM roles r
INNER JOIN roles_permisos rp ON r.id = rp.rol_id
INNER JOIN permisos p ON rp.permiso_id = p.id
WHERE r.activo = 1
ORDER BY r.nivel DESC, p.recurso, p.accion;

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS ÚTILES
-- ============================================

DELIMITER $$

-- Asignar rol a usuario
CREATE PROCEDURE `asignar_rol_usuario`(
    IN p_usuario_id INT,
    IN p_rol_nombre VARCHAR(50),
    IN p_asignado_por INT
)
BEGIN
    DECLARE v_rol_id INT;
    
    -- Obtener ID del rol
    SELECT id INTO v_rol_id FROM roles WHERE nombre = p_rol_nombre AND activo = 1 LIMIT 1;
    
    IF v_rol_id IS NOT NULL THEN
        -- Insertar o actualizar
        INSERT INTO usuarios_roles (usuario_id, rol_id, asignado_por, activo)
        VALUES (p_usuario_id, v_rol_id, p_asignado_por, 1)
        ON DUPLICATE KEY UPDATE activo = 1, fecha_asignacion = CURRENT_TIMESTAMP;
        
        SELECT 'Rol asignado correctamente' AS mensaje, v_rol_id AS rol_id;
    ELSE
        SELECT 'Rol no encontrado' AS error;
    END IF;
END$$

-- Verificar si usuario tiene permiso
CREATE FUNCTION `usuario_tiene_permiso`(
    p_usuario_id INT,
    p_permiso_nombre VARCHAR(100)
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_tiene_permiso TINYINT(1);
    
    SELECT COUNT(*) > 0 INTO v_tiene_permiso
    FROM usuarios_roles ur
    INNER JOIN roles_permisos rp ON ur.rol_id = rp.rol_id
    INNER JOIN permisos p ON rp.permiso_id = p.id
    WHERE ur.usuario_id = p_usuario_id
    AND ur.activo = 1
    AND p.nombre = p_permiso_nombre;
    
    RETURN v_tiene_permiso;
END$$

-- Obtener permisos de un usuario
CREATE PROCEDURE `obtener_permisos_usuario`(
    IN p_usuario_id INT
)
BEGIN
    SELECT DISTINCT
        p.nombre AS permiso,
        p.recurso,
        p.accion,
        p.descripcion,
        r.nombre AS rol
    FROM usuarios_roles ur
    INNER JOIN roles r ON ur.rol_id = r.id
    INNER JOIN roles_permisos rp ON r.id = rp.rol_id
    INNER JOIN permisos p ON rp.permiso_id = p.id
    WHERE ur.usuario_id = p_usuario_id
    AND ur.activo = 1
    AND r.activo = 1
    ORDER BY p.recurso, p.accion;
END$$

DELIMITER ;

-- ============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================

-- Nota: Estos ALTER pueden dar error si los índices ya existen, es normal
-- ALTER TABLE usuarios_roles ADD INDEX idx_activo (activo);
-- ALTER TABLE roles ADD INDEX idx_activo (activo);

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

/*
✅ Sistema RBAC completo implementado

ROLES INCLUIDOS:
1. admin (nivel 100) - Acceso total
2. entrenador (nivel 50) - Gestión de clientes y rutinas
3. cliente (nivel 10) - Acceso básico
4. recepcionista (nivel 30) - Gestión operativa

PRÓXIMOS PASOS:
1. Ejecutar este script en tu base de datos
2. Implementar middleware en index.js
3. Asignar roles a usuarios existentes
4. Proteger endpoints con verificación de permisos

EJEMPLO DE USO:
- CALL asignar_rol_usuario(1, 'admin', 1);
- SELECT usuario_tiene_permiso(1, 'usuarios.crear');
- CALL obtener_permisos_usuario(1);
*/
