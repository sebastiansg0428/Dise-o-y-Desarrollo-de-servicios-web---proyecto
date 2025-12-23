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

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`nombre`, `apellido`, `email`, `password`, `telefono`, `membresia`, `estado`, `precio_membresia`, `fecha_vencimiento`, `ultima_visita`, `total_visitas`) VALUES
('Sebastián', 'García', 'sebastiansg0428@gmail.com', '123456', '555-0001', 'premium', 'activo', 50.00, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 15),
('Admin', 'Sistema', 'admin@gmail.com', '123456', '555-0002', 'vip', 'activo', 80.00, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 25),
('María', 'López', 'maria@gmail.com', '123456', '555-0003', 'basica', 'activo', 30.00, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 8),
('Carlos', 'Rodríguez', 'carlos@gmail.com', '123456', '555-0004', 'premium', 'activo', 50.00, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 12),
('Ana', 'Martínez', 'ana@gmail.com', '123456', '555-0005', 'basica', 'activo', 30.00, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), NOW(), 5);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;