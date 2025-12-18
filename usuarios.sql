-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-11-2025 a las 03:28:56
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `meli`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(150) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password` int(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`) VALUES
(1, 'Sebastián', 'sebastiansg0428@gmail.com', 123456),
(7, 'Admin', 'admin@gmail.com', 123456),
(8, 'Admin2', 'admin2@gmail.com', 123456),
(9, 'Admin1', 'admin1@gmail.com', 123456),
(11, 'Admin3', 'admin3@gmail.com', 123456);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(150) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
-- --------------------------------------------------------
-- Tabla `productos` (para gestión de inventario y ventas)
-- --------------------------------------------------------
CREATE TABLE `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text,
  `categoria` varchar(100) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `precio_compra` decimal(10,2) NOT NULL DEFAULT 0.00,
  `precio_venta` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Datos de ejemplo para `productos`
INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `categoria`, `stock`, `precio_compra`, `precio_venta`) VALUES
(1, 'Proteína Whey 1kg', 'Proteína en polvo sabor vainilla', 'Suplementos', 10, 20.00, 35.00),
(2, 'Barra energética', 'Barra de cereales y frutos secos', 'Alimentos', 50, 0.50, 1.50);
-- --------------------------------------------------------
-- Tablas para gestión de rutinas y ejercicios
-- --------------------------------------------------------

CREATE TABLE `ejercicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text,
  `grupo_muscular` varchar(100) DEFAULT NULL,
  `equipo` varchar(100) DEFAULT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `rutinas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text,
  `nivel` varchar(50) DEFAULT NULL,
  `objetivo` varchar(150) DEFAULT NULL,
  `duracion_semanas` int(11) DEFAULT NULL,
  `frecuencia_por_semana` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `rutina_ejercicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rutina_id` int(11) NOT NULL,
  `ejercicio_id` int(11) NOT NULL,
  `orden` int(11) DEFAULT 0,
  `series` int(11) DEFAULT NULL,
  `repeticiones_min` int(11) DEFAULT NULL,
  `repeticiones_max` int(11) DEFAULT NULL,
  `descanso_seg` int(11) DEFAULT NULL,
  `peso_kg` decimal(6,2) DEFAULT NULL,
  `notas` text,
  PRIMARY KEY (`id`),
  KEY `idx_rutina` (`rutina_id`),
  KEY `idx_ejercicio` (`ejercicio_id`),
  CONSTRAINT `fk_re_rutina` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_re_ejercicio` FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `usuarios_rutinas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(150) NOT NULL,
  `rutina_id` int(11) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` varchar(50) DEFAULT 'activa',
  `progreso` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_rutina_usr` (`rutina_id`),
  CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ur_rutina` FOREIGN KEY (`rutina_id`) REFERENCES `rutinas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Datos de ejemplo para `ejercicios`
INSERT INTO `ejercicios` (`id`, `nombre`, `descripcion`, `grupo_muscular`, `equipo`, `tipo`) VALUES
(1, 'Sentadilla', 'Sentadilla con barra', 'Piernas', 'Barra', 'Fuerza'),
(2, 'Press banca', 'Press de banca con barra', 'Pecho', 'Barra', 'Fuerza'),
(3, 'Remo con barra', 'Remo inclinado con barra', 'Espalda', 'Barra', 'Fuerza'),
(4, 'Curl bíceps', 'Curl con mancuernas', 'Bíceps', 'Mancuernas', 'Fuerza'),
(5, 'Cardio cinta', 'Caminata o corrida en cinta', 'Cardio', 'Cinta', 'Cardio');

-- Rutina de ejemplo
INSERT INTO `rutinas` (`id`, `nombre`, `descripcion`, `nivel`, `objetivo`, `duracion_semanas`, `frecuencia_por_semana`) VALUES
(1, 'Full Body Inicial', 'Rutina full body para principiantes', 'principiante', 'ganar fuerza y adaptación', 8, 3);

-- Asociar ejercicios a la rutina
INSERT INTO `rutina_ejercicios` (`rutina_id`, `ejercicio_id`, `orden`, `series`, `repeticiones_min`, `repeticiones_max`, `descanso_seg`) VALUES
(1, 1, 1, 3, 8, 12, 90),
(1, 2, 2, 3, 8, 12, 90),
(1, 3, 3, 3, 8, 12, 90),
(1, 4, 4, 2, 10, 15, 60),
(1, 5, 5, NULL, NULL, NULL, NULL);

-- Asignación de rutina a un usuario (ejemplo)
INSERT INTO `usuarios_rutinas` (`usuario_id`, `rutina_id`, `fecha_inicio`, `estado`) VALUES
(1, 1, CURDATE(), 'activa');

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
