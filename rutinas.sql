-- phpMyAdmin SQL Dump
-- Sistema de Rutinas para Gimnasio
-- Base de datos: `meli`

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Tabla de EJERCICIOS
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Tabla de RUTINAS
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Tabla INTERMEDIA: Ejercicios en Rutinas
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Tabla de ASIGNACIONES de Rutinas a Usuarios
-- --------------------------------------------------------
CREATE TABLE `usuarios_rutinas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `rutina_id` int(11) NOT NULL,
  `fecha_asignacion` date DEFAULT CURDATE(),
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

-- ========================================
-- DATOS DE EJEMPLO: EJERCICIOS
-- ========================================

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

-- ========================================
-- DATOS DE EJEMPLO: RUTINAS
-- ========================================

INSERT INTO `rutinas` (`nombre`, `descripcion`, `objetivo`, `nivel`, `duracion_estimada`, `frecuencia_semanal`, `tipo`) VALUES
('Full Body Principiante', 'Rutina completa para todo el cuerpo, ideal para empezar', 'tonificacion', 'principiante', 60, 3, 'publica'),
('Fuerza Upper Body', 'Rutina enfocada en tren superior', 'fuerza', 'intermedio', 75, 4, 'publica'),
('Fuerza Lower Body', 'Rutina enfocada en tren inferior', 'fuerza', 'intermedio', 70, 3, 'publica'),
('Hipertrofia Push', 'Rutina push para ganancia muscular', 'hipertrofia', 'avanzado', 90, 2, 'publica'),
('Hipertrofia Pull', 'Rutina pull para ganancia muscular', 'hipertrofia', 'avanzado', 90, 2, 'publica'),
('Cardio + Tonificación', 'Combina cardio con ejercicios de fuerza', 'perdida_peso', 'principiante', 50, 5, 'publica'),
('HIIT Intenso', 'Entrenamiento de alta intensidad', 'perdida_peso', 'avanzado', 45, 4, 'publica');

-- ========================================
-- ASIGNACIÓN DE EJERCICIOS A RUTINAS
-- ========================================

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

COMMIT;

-- ========================================
-- CONSULTAS ÚTILES DE EJEMPLO
-- ========================================

-- Ver rutina completa con sus ejercicios
/*
SELECT 
    r.id, r.nombre as rutina, r.descripcion, r.objetivo, r.nivel,
    re.orden, e.nombre as ejercicio, e.grupo_muscular,
    re.series, re.repeticiones, re.descanso, re.peso_sugerido, re.notas
FROM rutinas r
INNER JOIN rutinas_ejercicios re ON r.id = re.rutina_id
INNER JOIN ejercicios e ON re.ejercicio_id = e.id
WHERE r.id = 1
ORDER BY re.orden;
*/

-- Ver rutinas asignadas a un usuario
/*
SELECT 
    u.nombre as usuario, r.nombre as rutina, ur.estado, ur.progreso,
    ur.fecha_asignacion, ur.fecha_inicio
FROM usuarios_rutinas ur
INNER JOIN usuarios u ON ur.usuario_id = u.id
INNER JOIN rutinas r ON ur.rutina_id = r.id
WHERE u.id = 1;
*/
