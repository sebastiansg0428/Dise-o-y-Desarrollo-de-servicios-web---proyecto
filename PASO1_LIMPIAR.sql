-- ================================================
-- OPCIÓN 1: Si ves error #1451, SÁLTATE ESTE ARCHIVO
-- y ejecuta directamente rbac_sistema_completo.sql
-- (ese archivo ya maneja tablas existentes con IF NOT EXISTS)
-- ================================================

-- OPCIÓN 2: Ejecuta estas líneas UNA POR UNA en phpMyAdmin:
-- 1. Primero ejecuta SOLO esta línea:
--    SET FOREIGN_KEY_CHECKS = 0;
-- 2. Luego ejecuta cada DROP por separado
-- 3. Al final ejecuta:
--    SET FOREIGN_KEY_CHECKS = 1;

-- ================================================
-- Si prefieres copiar todo, intenta esto:
-- ================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS `vista_usuarios_roles`;
DROP VIEW IF EXISTS `vista_roles_estadisticas`;
DROP VIEW IF EXISTS `vista_roles_permisos`;

DROP PROCEDURE IF EXISTS `asignar_rol_usuario`;
DROP PROCEDURE IF EXISTS `obtener_permisos_usuario`;
DROP FUNCTION IF EXISTS `usuario_tiene_permiso`;

DROP TABLE IF EXISTS `roles_permisos`;
DROP TABLE IF EXISTS `usuarios_roles`;
DROP TABLE IF EXISTS `permisos`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- ================================================
-- Después de ejecutar esto, ejecuta rbac_sistema_completo.sql
-- ================================================
