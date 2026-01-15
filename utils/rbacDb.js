/**
 * UTILIDADES PARA GESTIÓN DE RBAC
 * Funciones helper para administración de roles y permisos
 */

const mysql = require('mysql2');

let pool;

// Inicializar el pool
const initRbacDb = (dbPool) => {
    pool = dbPool;
};

/**
 * Asignar un rol a un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {string} rolNombre - Nombre del rol
 * @param {number} asignadoPor - ID del usuario que asigna
 * @returns {Promise<object>}
 */
const asignarRol = async (usuarioId, rolNombre, asignadoPor = null) => {
    try {
        // Obtener ID del rol
        const [roles] = await pool.promise().query(
            'SELECT id FROM roles WHERE nombre = ? AND activo = 1',
            [rolNombre]
        );

        if (roles.length === 0) {
            return { success: false, error: 'Rol no encontrado' };
        }

        const rolId = roles[0].id;

        // Asignar rol
        await pool.promise().query(`
            INSERT INTO usuarios_roles (usuario_id, rol_id, asignado_por, activo)
            VALUES (?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
                activo = 1, 
                fecha_asignacion = CURRENT_TIMESTAMP,
                asignado_por = VALUES(asignado_por)
        `, [usuarioId, rolId, asignadoPor]);

        return { success: true, mensaje: 'Rol asignado correctamente', rolId };
    } catch (error) {
        console.error('Error al asignar rol:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Revocar un rol de un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {string} rolNombre - Nombre del rol
 * @returns {Promise<object>}
 */
const revocarRol = async (usuarioId, rolNombre) => {
    try {
        const [roles] = await pool.promise().query(
            'SELECT id FROM roles WHERE nombre = ?',
            [rolNombre]
        );

        if (roles.length === 0) {
            return { success: false, error: 'Rol no encontrado' };
        }

        const rolId = roles[0].id;

        await pool.promise().query(`
            UPDATE usuarios_roles 
            SET activo = 0 
            WHERE usuario_id = ? AND rol_id = ?
        `, [usuarioId, rolId]);

        return { success: true, mensaje: 'Rol revocado correctamente' };
    } catch (error) {
        console.error('Error al revocar rol:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Obtener todos los roles disponibles
 * @returns {Promise<Array>}
 */
const obtenerTodosLosRoles = async () => {
    try {
        const [roles] = await pool.promise().query(`
            SELECT 
                r.id,
                r.nombre,
                r.descripcion,
                r.nivel,
                COUNT(ur.usuario_id) as total_usuarios
            FROM roles r
            LEFT JOIN usuarios_roles ur ON r.id = ur.rol_id AND ur.activo = 1
            WHERE r.activo = 1
            GROUP BY r.id
            ORDER BY r.nivel DESC
        `);

        return roles;
    } catch (error) {
        console.error('Error al obtener roles:', error);
        return [];
    }
};

/**
 * Obtener todos los permisos disponibles
 * @param {string} recurso - Filtrar por recurso (opcional)
 * @returns {Promise<Array>}
 */
const obtenerTodosLosPermisos = async (recurso = null) => {
    try {
        let query = `
            SELECT 
                id,
                nombre,
                descripcion,
                recurso,
                accion
            FROM permisos
            ORDER BY recurso, accion
        `;

        const params = [];

        if (recurso) {
            query = `
                SELECT 
                    id,
                    nombre,
                    descripcion,
                    recurso,
                    accion
                FROM permisos
                WHERE recurso = ?
                ORDER BY accion
            `;
            params.push(recurso);
        }

        const [permisos] = await pool.promise().query(query, params);
        return permisos;
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        return [];
    }
};

/**
 * Asignar permiso a un rol
 * @param {string} rolNombre - Nombre del rol
 * @param {string} permisoNombre - Nombre del permiso
 * @returns {Promise<object>}
 */
const asignarPermisoARol = async (rolNombre, permisoNombre) => {
    try {
        // Obtener IDs
        const [roles] = await pool.promise().query(
            'SELECT id FROM roles WHERE nombre = ? AND activo = 1',
            [rolNombre]
        );

        const [permisos] = await pool.promise().query(
            'SELECT id FROM permisos WHERE nombre = ?',
            [permisoNombre]
        );

        if (roles.length === 0) {
            return { success: false, error: 'Rol no encontrado' };
        }

        if (permisos.length === 0) {
            return { success: false, error: 'Permiso no encontrado' };
        }

        await pool.promise().query(`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE rol_id = rol_id
        `, [roles[0].id, permisos[0].id]);

        return { success: true, mensaje: 'Permiso asignado al rol correctamente' };
    } catch (error) {
        console.error('Error al asignar permiso a rol:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Revocar permiso de un rol
 * @param {string} rolNombre - Nombre del rol
 * @param {string} permisoNombre - Nombre del permiso
 * @returns {Promise<object>}
 */
const revocarPermisoDeRol = async (rolNombre, permisoNombre) => {
    try {
        await pool.promise().query(`
            DELETE rp FROM roles_permisos rp
            INNER JOIN roles r ON rp.rol_id = r.id
            INNER JOIN permisos p ON rp.permiso_id = p.id
            WHERE r.nombre = ? AND p.nombre = ?
        `, [rolNombre, permisoNombre]);

        return { success: true, mensaje: 'Permiso revocado del rol correctamente' };
    } catch (error) {
        console.error('Error al revocar permiso de rol:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Obtener permisos de un rol específico
 * @param {string} rolNombre - Nombre del rol
 * @returns {Promise<Array>}
 */
const obtenerPermisosDeRol = async (rolNombre) => {
    try {
        const [permisos] = await pool.promise().query(`
            SELECT 
                p.nombre,
                p.descripcion,
                p.recurso,
                p.accion
            FROM roles r
            INNER JOIN roles_permisos rp ON r.id = rp.rol_id
            INNER JOIN permisos p ON rp.permiso_id = p.id
            WHERE r.nombre = ?
            AND r.activo = 1
            ORDER BY p.recurso, p.accion
        `, [rolNombre]);

        return permisos;
    } catch (error) {
        console.error('Error al obtener permisos de rol:', error);
        return [];
    }
};

/**
 * Crear un nuevo rol
 * @param {string} nombre - Nombre del rol
 * @param {string} descripcion - Descripción del rol
 * @param {number} nivel - Nivel del rol (1-100)
 * @returns {Promise<object>}
 */
const crearRol = async (nombre, descripcion, nivel = 10) => {
    try {
        const [result] = await pool.promise().query(`
            INSERT INTO roles (nombre, descripcion, nivel, activo)
            VALUES (?, ?, ?, 1)
        `, [nombre, descripcion, nivel]);

        return {
            success: true,
            mensaje: 'Rol creado correctamente',
            rolId: result.insertId
        };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return { success: false, error: 'Ya existe un rol con ese nombre' };
        }
        console.error('Error al crear rol:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Crear un nuevo permiso
 * @param {string} nombre - Nombre del permiso
 * @param {string} descripcion - Descripción
 * @param {string} recurso - Recurso (usuarios, pagos, etc)
 * @param {string} accion - Acción (create, read, update, delete)
 * @returns {Promise<object>}
 */
const crearPermiso = async (nombre, descripcion, recurso, accion) => {
    try {
        const [result] = await pool.promise().query(`
            INSERT INTO permisos (nombre, descripcion, recurso, accion)
            VALUES (?, ?, ?, ?)
        `, [nombre, descripcion, recurso, accion]);

        return {
            success: true,
            mensaje: 'Permiso creado correctamente',
            permisoId: result.insertId
        };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return { success: false, error: 'Ya existe un permiso con ese nombre' };
        }
        console.error('Error al crear permiso:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Obtener estadísticas del sistema RBAC
 * @returns {Promise<object>}
 */
const obtenerEstadisticasRBAC = async () => {
    try {
        const [stats] = await pool.promise().query(`
            SELECT 
                (SELECT COUNT(*) FROM roles WHERE activo = 1) as total_roles,
                (SELECT COUNT(*) FROM permisos) as total_permisos,
                (SELECT COUNT(*) FROM usuarios_roles WHERE activo = 1) as total_asignaciones,
                (SELECT COUNT(DISTINCT usuario_id) FROM usuarios_roles WHERE activo = 1) as usuarios_con_roles
        `);

        const [rolesMasUsados] = await pool.promise().query(`
            SELECT 
                r.nombre,
                r.descripcion,
                COUNT(ur.usuario_id) as usuarios
            FROM roles r
            LEFT JOIN usuarios_roles ur ON r.id = ur.rol_id AND ur.activo = 1
            WHERE r.activo = 1
            GROUP BY r.id
            ORDER BY usuarios DESC
            LIMIT 5
        `);

        return {
            ...stats[0],
            roles_mas_usados: rolesMasUsados
        };
    } catch (error) {
        console.error('Error al obtener estadísticas RBAC:', error);
        return null;
    }
};

/**
 * Sincronizar roles de múltiples usuarios (útil para migraciones)
 * @param {Array} asignaciones - Array de {usuarioId, rolNombre}
 * @returns {Promise<object>}
 */
const sincronizarRolesEnMasa = async (asignaciones) => {
    const connection = await pool.promise().getConnection();
    
    try {
        await connection.beginTransaction();

        let exitosos = 0;
        let errores = 0;

        for (const { usuarioId, rolNombre } of asignaciones) {
            try {
                const [roles] = await connection.query(
                    'SELECT id FROM roles WHERE nombre = ? AND activo = 1',
                    [rolNombre]
                );

                if (roles.length > 0) {
                    await connection.query(`
                        INSERT INTO usuarios_roles (usuario_id, rol_id, activo)
                        VALUES (?, ?, 1)
                        ON DUPLICATE KEY UPDATE activo = 1
                    `, [usuarioId, roles[0].id]);
                    exitosos++;
                } else {
                    errores++;
                }
            } catch (error) {
                console.error(`Error asignando rol a usuario ${usuarioId}:`, error);
                errores++;
            }
        }

        await connection.commit();

        return {
            success: true,
            mensaje: 'Sincronización completada',
            exitosos,
            errores
        };
    } catch (error) {
        await connection.rollback();
        console.error('Error en sincronización masiva:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
};

module.exports = {
    initRbacDb,
    asignarRol,
    revocarRol,
    obtenerTodosLosRoles,
    obtenerTodosLosPermisos,
    asignarPermisoARol,
    revocarPermisoDeRol,
    obtenerPermisosDeRol,
    crearRol,
    crearPermiso,
    obtenerEstadisticasRBAC,
    sincronizarRolesEnMasa
};
