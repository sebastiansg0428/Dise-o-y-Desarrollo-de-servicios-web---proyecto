-- Sistema de Entrenadores para Gimnasio
-- Base de datos: `meli`

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Tabla de ENTRENADORES
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Tabla de HORARIOS de Entrenadores (disponibilidad)
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Tabla de ASIGNACIÓN de Clientes (Usuarios) a Entrenadores
-- --------------------------------------------------------
CREATE TABLE `entrenadores_clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entrenador_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_asignacion` date DEFAULT CURDATE(),
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

-- --------------------------------------------------------
-- Tabla de SESIONES de Entrenamiento
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Tabla de VALORACIONES de Entrenadores
-- --------------------------------------------------------
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

-- ========================================
-- DATOS DE EJEMPLO
-- ========================================
INSERT INTO `entrenadores` (`nombre`, `apellido`, `email`, `telefono`, `genero`, `especialidad_principal`, `experiencia_anios`, `certificaciones`, `biografia`, `tarifa_rutina`) VALUES
('Luis', 'Pérez', 'luis.perez@gym.com', '555-1001', 'M', 'fuerza', 6, 'NASM-CPT, Crossfit L1', 'Entrenador enfocado en fuerza y técnica.', 20.00),
('Carla', 'Suárez', 'carla.suarez@gym.com', '555-1002', 'F', 'hipertrofia', 4, 'ACE-CPT', 'Especialista en hipertrofia y recomposición corporal.', 18.00),
('Diego', 'Ramírez', 'diego.ramirez@gym.com', '555-1003', 'M', 'funcional', 8, 'NSCA-CSCS', 'Entrenamientos funcionales y prevención de lesiones.', 22.50);

INSERT INTO `entrenadores_horarios` (`entrenador_id`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
(1, 'lunes', '09:00:00', '12:00:00'),
(1, 'miercoles', '16:00:00', '20:00:00'),
(2, 'martes', '10:00:00', '14:00:00'),
(2, 'jueves', '15:00:00', '19:00:00'),
(3, 'viernes', '08:00:00', '12:00:00');

INSERT INTO `entrenadores_clientes` (`entrenador_id`, `usuario_id`, `estado`) VALUES
(1, 1, 'activo'),
(2, 2, 'activo');

INSERT INTO `sesiones_entrenamiento` (`entrenador_id`, `usuario_id`, `rutina_id`, `fecha`, `duracion_minutos`, `tipo`, `ubicacion`, `estado`, `notas`) VALUES
(1, 1, 1, DATE_ADD(NOW(), INTERVAL 1 DAY), 60, 'personal', 'gimnasio', 'programada', 'Evaluar técnica en sentadilla'),
(2, 2, 2, DATE_ADD(NOW(), INTERVAL 2 DAY), 75, 'personal', 'gimnasio', 'programada', 'Push day hipertrofia');

INSERT INTO `valoraciones_entrenadores` (`entrenador_id`, `usuario_id`, `puntuacion`, `comentario`) VALUES
(1, 1, 5, 'Excelente atención y técnica'),
(2, 2, 4, 'Muy buena sesión, volveré a entrenar con Carla');

COMMIT;