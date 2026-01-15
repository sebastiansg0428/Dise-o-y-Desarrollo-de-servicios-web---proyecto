/**
 * MIDDLEWARE DE RBAC (Role-Based Access Control)
 * Sistema profesional de control de acceso basado en roles
 */

const mysql = require('mysql2');

// Pool de conexiones (usar el mismo del index.js)
let pool;

// Inicializar el pool
const initPool = (dbPool) => {
    pool = dbPool;
};

/**
 * Middleware para verificar que el usuario tenga un rol específico
 * @param {string|Array} rolesPermitidos - Rol o array de roles permitidos
 */
const verificarRol = (rolesPermitidos) => {
    return async (req, res, next) => {
        try {
            const usuarioId = req.usuario?.id;

            if (!usuarioId) {
                return res.status(401).json({
                    error: 'No autenticado',
                    mensaje: 'Debe iniciar sesión para acceder a este recurso'
                });
            }

            // Convertir a array si es un string
            const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];

            // Consultar roles del usuario
            const [rolesUsuario] = await pool.promise().query(`
                SELECT r.nombre, r.nivel
                FROM usuarios_roles ur
                INNER JOIN roles r ON ur.rol_id = r.id
                WHERE ur.usuario_id = ?
                AND ur.activo = 1
                AND r.activo = 1
            `, [usuarioId]);

            if (rolesUsuario.length === 0) {
                return res.status(403).json({
                    error: 'Sin permisos',
                    mensaje: 'No tiene roles asignados'
                });
            }

            // Verificar si tiene alguno de los roles permitidos
            const tieneRol = rolesUsuario.some(rol => roles.includes(rol.nombre));

            if (!tieneRol) {
                return res.status(403).json({
                    error: 'Acceso denegado',
                    mensaje: `Requiere uno de estos roles: ${roles.join(', ')}`,
                    rolesActuales: rolesUsuario.map(r => r.nombre)
                });
            }

            // Agregar roles al request para uso posterior
            req.usuario.roles = rolesUsuario.map(r => r.nombre);
            req.usuario.nivel = Math.max(...rolesUsuario.map(r => r.nivel));

            next();
        } catch (error) {
            console.error('Error en verificarRol:', error);
            res.status(500).json({
                error: 'Error del servidor',
                mensaje: 'Error al verificar roles'
            });
        }
    };
};

/**
 * Middleware para verificar que el usuario tenga un permiso específico
 * @param {string|Array} permisosRequeridos - Permiso o array de permisos requeridos
 */
const verificarPermiso = (permisosRequeridos) => {
    return async (req, res, next) => {
        try {
            const usuarioId = req.usuario?.id;

            if (!usuarioId) {
                return res.status(401).json({
                    error: 'No autenticado',
                    mensaje: 'Debe iniciar sesión'
                });
            }

            // Convertir a array si es un string
            const permisos = Array.isArray(permisosRequeridos) ? permisosRequeridos : [permisosRequeridos];

            // Consultar permisos del usuario (a través de sus roles)
            const [permisosUsuario] = await pool.promise().query(`
                SELECT DISTINCT p.nombre, p.recurso, p.accion
                FROM usuarios_roles ur
                INNER JOIN roles_permisos rp ON ur.rol_id = rp.rol_id
                INNER JOIN permisos p ON rp.permiso_id = p.id
                WHERE ur.usuario_id = ?
                AND ur.activo = 1
            `, [usuarioId]);

            if (permisosUsuario.length === 0) {
                return res.status(403).json({
                    error: 'Sin permisos',
                    mensaje: 'No tiene permisos asignados'
                });
            }

            // Verificar si tiene alguno de los permisos requeridos
            const nombresPermisos = permisosUsuario.map(p => p.nombre);
            const tienePermiso = permisos.some(permiso => nombresPermisos.includes(permiso));

            if (!tienePermiso) {
                return res.status(403).json({
                    error: 'Permiso denegado',
                    mensaje: `Requiere uno de estos permisos: ${permisos.join(', ')}`,
                    permisosActuales: nombresPermisos
                });
            }

            // Agregar permisos al request
            req.usuario.permisos = nombresPermisos;

            next();
        } catch (error) {
            console.error('Error en verificarPermiso:', error);
            res.status(500).json({
                error: 'Error del servidor',
                mensaje: 'Error al verificar permisos'
            });
        }
    };
};

/**
 * Middleware para verificar nivel mínimo de rol
 * @param {number} nivelMinimo - Nivel mínimo requerido
 */
const verificarNivel = (nivelMinimo) => {
    return async (req, res, next) => {
        try {
            const usuarioId = req.usuario?.id;

            if (!usuarioId) {
                return res.status(401).json({
                    error: 'No autenticado',
                    mensaje: 'Debe iniciar sesión'
                });
            }

            // Obtener nivel máximo del usuario
            const [roles] = await pool.promise().query(`
                SELECT MAX(r.nivel) as nivel_maximo
                FROM usuarios_roles ur
                INNER JOIN roles r ON ur.rol_id = r.id
                WHERE ur.usuario_id = ?
                AND ur.activo = 1
                AND r.activo = 1
            `, [usuarioId]);

            const nivelUsuario = roles[0]?.nivel_maximo || 0;

            if (nivelUsuario < nivelMinimo) {
                return res.status(403).json({
                    error: 'Nivel insuficiente',
                    mensaje: `Requiere nivel ${nivelMinimo} o superior`,
                    nivelActual: nivelUsuario
                });
            }

            req.usuario.nivel = nivelUsuario;
            next();
        } catch (error) {
            console.error('Error en verificarNivel:', error);
            res.status(500).json({
                error: 'Error del servidor',
                mensaje: 'Error al verificar nivel'
            });
        }
    };
};

/**
 * Middleware para verificar si el usuario es admin
 */
const esAdmin = () => verificarRol('admin');

/**
 * Middleware para verificar si el usuario es admin o entrenador
 */
const esAdminOEntrenador = () => verificarRol(['admin', 'entrenador']);

/**
 * Middleware para verificar si el usuario puede acceder a su propio recurso o es admin
 * @param {string} paramName - Nombre del parámetro que contiene el ID del usuario
 */
const esPropioDuenioOAdmin = (paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const usuarioId = req.usuario?.id;
            const recursoId = parseInt(req.params[paramName]);

            if (!usuarioId) {
                return res.status(401).json({
                    error: 'No autenticado',
                    mensaje: 'Debe iniciar sesión'
                });
            }

            // Si es el propio usuario, permitir
            if (usuarioId === recursoId) {
                return next();
            }

            // Si no es el propio usuario, verificar si es admin
            const [roles] = await pool.promise().query(`
                SELECT r.nombre
                FROM usuarios_roles ur
                INNER JOIN roles r ON ur.rol_id = r.id
                WHERE ur.usuario_id = ?
                AND ur.activo = 1
                AND r.nombre = 'admin'
            `, [usuarioId]);

            if (roles.length > 0) {
                return next();
            }

            return res.status(403).json({
                error: 'Acceso denegado',
                mensaje: 'Solo puede acceder a sus propios recursos o ser administrador'
            });
        } catch (error) {
            console.error('Error en esPropioDuenioOAdmin:', error);
            res.status(500).json({
                error: 'Error del servidor',
                mensaje: 'Error al verificar permisos'
            });
        }
    };
};

/**
 * Helper para obtener todos los permisos de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Array de permisos
 */
const obtenerPermisosUsuario = async (usuarioId) => {
    try {
        const [permisos] = await pool.promise().query(`
            SELECT DISTINCT 
                p.nombre,
                p.recurso,
                p.accion,
                p.descripcion
            FROM usuarios_roles ur
            INNER JOIN roles_permisos rp ON ur.rol_id = rp.rol_id
            INNER JOIN permisos p ON rp.permiso_id = p.id
            WHERE ur.usuario_id = ?
            AND ur.activo = 1
            ORDER BY p.recurso, p.accion
        `, [usuarioId]);

        return permisos;
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        return [];
    }
};

/**
 * Helper para obtener todos los roles de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Array de roles
 */
const obtenerRolesUsuario = async (usuarioId) => {
    try {
        const [roles] = await pool.promise().query(`
            SELECT 
                r.id,
                r.nombre,
                r.descripcion,
                r.nivel,
                ur.fecha_asignacion
            FROM usuarios_roles ur
            INNER JOIN roles r ON ur.rol_id = r.id
            WHERE ur.usuario_id = ?
            AND ur.activo = 1
            AND r.activo = 1
            ORDER BY r.nivel DESC
        `, [usuarioId]);

        return roles;
    } catch (error) {
        console.error('Error al obtener roles:', error);
        return [];
    }
};

/**
 * Helper para verificar si un usuario tiene un permiso específico
 * @param {number} usuarioId - ID del usuario
 * @param {string} permisoNombre - Nombre del permiso
 * @returns {Promise<boolean>}
 */
const usuarioTienePermiso = async (usuarioId, permisoNombre) => {
    try {
        const [resultado] = await pool.promise().query(`
            SELECT COUNT(*) as tiene
            FROM usuarios_roles ur
            INNER JOIN roles_permisos rp ON ur.rol_id = rp.rol_id
            INNER JOIN permisos p ON rp.permiso_id = p.id
            WHERE ur.usuario_id = ?
            AND p.nombre = ?
            AND ur.activo = 1
        `, [usuarioId, permisoNombre]);

        return resultado[0].tiene > 0;
    } catch (error) {
        console.error('Error al verificar permiso:', error);
        return false;
    }
};

module.exports = {
    initPool,
    verificarRol,
    verificarPermiso,
    verificarNivel,
    esAdmin,
    esAdminOEntrenador,
    esPropioDuenioOAdmin,
    obtenerPermisosUsuario,
    obtenerRolesUsuario,
    usuarioTienePermiso
};
