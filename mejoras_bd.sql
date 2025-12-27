-- ========================================
-- MEJORAS Y OPTIMIZACIONES BASE DE DATOS
-- Sistema de Gimnasio - Base de datos: `meli`
-- ========================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ========================================
-- ÍNDICES ADICIONALES PARA MEJORAR RENDIMIENTO
-- ========================================

-- Usuarios: Índices compuestos para consultas frecuentes
ALTER TABLE `usuarios` 
ADD INDEX `idx_estado_membresia` (`estado`, `membresia`),
ADD INDEX `idx_fecha_vencimiento_estado` (`fecha_vencimiento`, `estado`),
ADD INDEX `idx_ultima_visita` (`ultima_visita`);

-- Productos: Índices para filtros comunes
ALTER TABLE `productos` 
ADD INDEX `idx_categoria_estado` (`categoria`, `estado`),
ADD INDEX `idx_stock_minimo` (`stock`, `stock_minimo`);

-- Ventas: Índices para reportes
ALTER TABLE `ventas` 
ADD INDEX `idx_fecha_metodo` (`created_at`, `metodo_pago`),
ADD INDEX `idx_producto_fecha` (`producto_id`, `created_at`);

-- Entrenadores: Índices para búsquedas frecuentes
ALTER TABLE `entrenadores` 
ADD INDEX `idx_especialidad_estado` (`especialidad_principal`, `estado`),
ADD INDEX `idx_tarifa` (`tarifa_rutina`);

-- Sesiones de entrenamiento: Índices para calendario
ALTER TABLE `sesiones_entrenamiento` 
ADD INDEX `idx_fecha_estado` (`fecha`, `estado`),
ADD INDEX `idx_entrenador_fecha_estado` (`entrenador_id`, `fecha`, `estado`),
ADD INDEX `idx_usuario_fecha` (`usuario_id`, `fecha`);

-- Ejercicios: Índices compuestos
ALTER TABLE `ejercicios` 
ADD INDEX `idx_grupo_tipo_nivel` (`grupo_muscular`, `tipo`, `nivel`),
ADD INDEX `idx_tipo_estado` (`tipo`, `estado`);

-- Rutinas: Índices para filtros
ALTER TABLE `rutinas` 
ADD INDEX `idx_objetivo_nivel` (`objetivo`, `nivel`),
ADD INDEX `idx_tipo_estado` (`tipo`, `estado`),
ADD INDEX `idx_popularidad` (`popularidad` DESC);

-- Usuarios Rutinas: Índice para progreso
ALTER TABLE `usuarios_rutinas` 
ADD INDEX `idx_usuario_estado` (`usuario_id`, `estado`),
ADD INDEX `idx_progreso` (`progreso`);

-- ========================================
-- VISTAS PARA SIMPLIFICAR CONSULTAS COMUNES
-- ========================================

-- Vista: Entrenadores con métricas
CREATE OR REPLACE VIEW `v_entrenadores_metricas` AS
SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.email,
    e.telefono,
    e.especialidad_principal,
    e.experiencia_anios,
    e.certificaciones,
    e.tarifa_rutina,
    e.estado,
    COALESCE(AVG(v.puntuacion), 0) as promedio_puntuacion,
    COUNT(DISTINCT v.id) as total_valoraciones,
    COUNT(DISTINCT ec.usuario_id) as total_clientes_activos,
    COUNT(DISTINCT CASE WHEN s.estado = 'completada' THEN s.id END) as sesiones_completadas,
    DATE_FORMAT(e.created_at, '%d/%m/%Y') as fecha_alta
FROM entrenadores e
LEFT JOIN valoraciones_entrenadores v ON v.entrenador_id = e.id
LEFT JOIN entrenadores_clientes ec ON ec.entrenador_id = e.id AND ec.estado = 'activo'
LEFT JOIN sesiones_entrenamiento s ON s.entrenador_id = e.id
GROUP BY e.id;

-- Vista: Productos con alertas de stock
CREATE OR REPLACE VIEW `v_productos_inventario` AS
SELECT 
    p.*,
    (p.precio_venta - p.precio_compra) as ganancia_unitaria,
    ((p.precio_venta - p.precio_compra) * p.stock) as ganancia_total_stock,
    (p.stock * p.precio_compra) as valor_inventario,
    CASE 
        WHEN p.stock = 0 THEN 'sin_stock'
        WHEN p.stock <= p.stock_minimo THEN 'stock_bajo'
        WHEN p.stock <= (p.stock_minimo * 2) THEN 'stock_medio'
        ELSE 'stock_normal'
    END as nivel_stock
FROM productos p
WHERE p.estado = 'activo';

-- Vista: Usuarios con estado de membresía
CREATE OR REPLACE VIEW `v_usuarios_membresia` AS
SELECT 
    u.id,
    u.nombre,
    u.apellido,
    u.email,
    u.telefono,
    u.membresia,
    u.precio_membresia,
    u.estado,
    u.total_visitas,
    DATE_FORMAT(u.ultima_visita, '%d/%m/%Y %H:%i') as ultima_visita_formatted,
    DATE_FORMAT(u.fecha_vencimiento, '%d/%m/%Y') as fecha_vencimiento_formatted,
    DATEDIFF(u.fecha_vencimiento, CURDATE()) as dias_restantes,
    CASE 
        WHEN u.fecha_vencimiento < CURDATE() THEN 'vencida'
        WHEN DATEDIFF(u.fecha_vencimiento, CURDATE()) <= 7 THEN 'por_vencer'
        ELSE 'vigente'
    END as estado_membresia
FROM usuarios u
WHERE u.estado = 'activo';

-- Vista: Rutinas populares con estadísticas
CREATE OR REPLACE VIEW `v_rutinas_populares` AS
SELECT 
    r.id,
    r.nombre,
    r.descripcion,
    r.objetivo,
    r.nivel,
    r.duracion_estimada,
    r.frecuencia_semanal,
    r.tipo,
    r.popularidad,
    COUNT(DISTINCT re.ejercicio_id) as total_ejercicios,
    COUNT(DISTINCT ur.usuario_id) as usuarios_asignados,
    COUNT(DISTINCT CASE WHEN ur.estado = 'completada' THEN ur.usuario_id END) as usuarios_completaron,
    CASE 
        WHEN COUNT(DISTINCT ur.usuario_id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN ur.estado = 'completada' THEN ur.usuario_id END) * 100.0 / COUNT(DISTINCT ur.usuario_id))
        ELSE 0 
    END as tasa_completacion
FROM rutinas r
LEFT JOIN rutinas_ejercicios re ON r.id = re.rutina_id
LEFT JOIN usuarios_rutinas ur ON r.id = ur.rutina_id
WHERE r.estado = 'activo' AND r.tipo = 'publica'
GROUP BY r.id
ORDER BY r.popularidad DESC, tasa_completacion DESC;

-- ========================================
-- PROCEDIMIENTOS ALMACENADOS
-- ========================================

-- Procedimiento: Renovar membresía de usuario
DELIMITER $$
CREATE PROCEDURE `sp_renovar_membresia`(
    IN p_usuario_id INT,
    IN p_meses INT
)
BEGIN
    DECLARE v_nueva_fecha DATE;
    DECLARE v_precio DECIMAL(8,2);
    
    -- Obtener precio de membresía
    SELECT precio_membresia INTO v_precio
    FROM usuarios
    WHERE id = p_usuario_id;
    
    -- Calcular nueva fecha (desde hoy o desde fecha anterior si está vigente)
    SELECT 
        CASE 
            WHEN fecha_vencimiento > CURDATE() 
            THEN DATE_ADD(fecha_vencimiento, INTERVAL p_meses MONTH)
            ELSE DATE_ADD(CURDATE(), INTERVAL p_meses MONTH)
        END INTO v_nueva_fecha
    FROM usuarios
    WHERE id = p_usuario_id;
    
    -- Actualizar fecha de vencimiento
    UPDATE usuarios 
    SET fecha_vencimiento = v_nueva_fecha,
        updated_at = NOW()
    WHERE id = p_usuario_id;
    
    SELECT 'Membresía renovada exitosamente' as mensaje, v_nueva_fecha as nueva_fecha_vencimiento;
END$$
DELIMITER ;

-- Procedimiento: Obtener disponibilidad de entrenador
DELIMITER $$
CREATE PROCEDURE `sp_disponibilidad_entrenador`(
    IN p_entrenador_id INT,
    IN p_fecha DATE
)
BEGIN
    DECLARE v_dia_semana VARCHAR(20);
    
    -- Obtener día de la semana en español
    SET v_dia_semana = CASE DAYOFWEEK(p_fecha)
        WHEN 1 THEN 'domingo'
        WHEN 2 THEN 'lunes'
        WHEN 3 THEN 'martes'
        WHEN 4 THEN 'miercoles'
        WHEN 5 THEN 'jueves'
        WHEN 6 THEN 'viernes'
        WHEN 7 THEN 'sabado'
    END;
    
    -- Obtener horarios disponibles sin sesiones programadas
    SELECT 
        h.id,
        h.dia_semana,
        h.hora_inicio,
        h.hora_fin,
        h.disponible,
        COUNT(s.id) as sesiones_programadas
    FROM entrenadores_horarios h
    LEFT JOIN sesiones_entrenamiento s ON 
        s.entrenador_id = p_entrenador_id 
        AND DATE(s.fecha) = p_fecha
        AND s.estado NOT IN ('cancelada', 'completada')
        AND TIME(s.fecha) >= h.hora_inicio 
        AND TIME(s.fecha) < h.hora_fin
    WHERE h.entrenador_id = p_entrenador_id
        AND h.dia_semana = v_dia_semana
        AND h.disponible = 1
    GROUP BY h.id
    HAVING sesiones_programadas = 0
    ORDER BY h.hora_inicio;
END$$
DELIMITER ;

-- Procedimiento: Calcular ingresos mensuales
DELIMITER $$
CREATE PROCEDURE `sp_ingresos_mes`(
    IN p_mes INT,
    IN p_anio INT
)
BEGIN
    SELECT 
        'Membresías' as fuente,
        SUM(precio_membresia) as total,
        COUNT(*) as cantidad
    FROM usuarios
    WHERE estado = 'activo'
        AND MONTH(created_at) = p_mes
        AND YEAR(created_at) = p_anio
    
    UNION ALL
    
    SELECT 
        'Ventas Productos' as fuente,
        SUM(total) as total,
        COUNT(*) as cantidad
    FROM ventas
    WHERE MONTH(created_at) = p_mes
        AND YEAR(created_at) = p_anio
    
    UNION ALL
    
    SELECT 
        'Total General' as fuente,
        SUM(sub.total) as total,
        SUM(sub.cantidad) as cantidad
    FROM (
        SELECT SUM(precio_membresia) as total, COUNT(*) as cantidad
        FROM usuarios
        WHERE estado = 'activo'
            AND MONTH(created_at) = p_mes
            AND YEAR(created_at) = p_anio
        
        UNION ALL
        
        SELECT SUM(total) as total, COUNT(*) as cantidad
        FROM ventas
        WHERE MONTH(created_at) = p_mes
            AND YEAR(created_at) = p_anio
    ) sub;
END$$
DELIMITER ;

-- ========================================
-- TRIGGERS PARA AUDITORÍA Y VALIDACIONES
-- ========================================

-- Trigger: Validar stock negativo en productos
DELIMITER $$
CREATE TRIGGER `trg_validar_stock_negativo`
BEFORE UPDATE ON `productos`
FOR EACH ROW
BEGIN
    IF NEW.stock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El stock no puede ser negativo';
    END IF;
END$$
DELIMITER ;

-- Trigger: Actualizar popularidad al asignar rutina
DELIMITER $$
CREATE TRIGGER `trg_actualizar_popularidad_rutina`
AFTER INSERT ON `usuarios_rutinas`
FOR EACH ROW
BEGIN
    UPDATE rutinas 
    SET popularidad = popularidad + 1 
    WHERE id = NEW.rutina_id;
END$$
DELIMITER ;

-- Trigger: Validar fecha de sesión no en el pasado
DELIMITER $$
CREATE TRIGGER `trg_validar_fecha_sesion`
BEFORE INSERT ON `sesiones_entrenamiento`
FOR EACH ROW
BEGIN
    IF NEW.fecha < NOW() AND NEW.estado = 'programada' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se puede programar una sesión en el pasado';
    END IF;
END$$
DELIMITER ;

-- ========================================
-- FUNCIONES ÚTILES
-- ========================================

-- Función: Calcular edad desde fecha de nacimiento
DELIMITER $$
CREATE FUNCTION `fn_calcular_edad`(p_fecha_nacimiento DATE)
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_fecha_nacimiento, CURDATE());
END$$
DELIMITER ;

-- Función: Obtener nivel de membresía como texto descriptivo
DELIMITER $$
CREATE FUNCTION `fn_descripcion_membresia`(p_membresia ENUM('basica','premium','vip'))
RETURNS VARCHAR(100)
DETERMINISTIC
BEGIN
    RETURN CASE p_membresia
        WHEN 'basica' THEN 'Básica - Acceso al gimnasio'
        WHEN 'premium' THEN 'Premium - Gimnasio + Clases grupales'
        WHEN 'vip' THEN 'VIP - Acceso completo + Entrenador personal'
        ELSE 'Desconocida'
    END;
END$$
DELIMITER ;

COMMIT;

-- ========================================
-- EJEMPLOS DE USO
-- ========================================

-- Renovar membresía por 3 meses
-- CALL sp_renovar_membresia(1, 3);

-- Ver disponibilidad de entrenador
-- CALL sp_disponibilidad_entrenador(1, '2025-12-27');

-- Calcular ingresos del mes actual
-- CALL sp_ingresos_mes(12, 2025);

-- Usar vistas
-- SELECT * FROM v_entrenadores_metricas WHERE estado = 'activo';
-- SELECT * FROM v_productos_inventario WHERE nivel_stock IN ('sin_stock', 'stock_bajo');
-- SELECT * FROM v_usuarios_membresia WHERE estado_membresia = 'por_vencer';
-- SELECT * FROM v_rutinas_populares LIMIT 10;

-- Usar funciones
-- SELECT nombre, fecha_nacimiento, fn_calcular_edad(fecha_nacimiento) as edad FROM usuarios;
-- SELECT nombre, membresia, fn_descripcion_membresia(membresia) as descripcion FROM usuarios;
