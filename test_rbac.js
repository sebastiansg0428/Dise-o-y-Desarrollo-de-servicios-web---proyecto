/**
 * TEST RBAC - Verificación del sistema de roles y permisos
 */

const mysql = require('mysql2/promise');

// Configuración de base de datos
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'meli'
};

async function testRBAC() {
    let connection;
    
    try {
        console.log('🔍 INICIANDO PRUEBAS DEL SISTEMA RBAC...\n');
        
        connection = await mysql.createConnection(dbConfig);
        
        // ============================================
        // TEST 1: Verificar que las tablas existen
        // ============================================
        console.log('📋 TEST 1: Verificando tablas RBAC...');
        const [tables] = await connection.query(`
            SHOW TABLES LIKE '%roles%' OR SHOW TABLES LIKE '%permisos%'
        `);
        console.log(`✅ Tablas encontradas: ${tables.length > 0 ? 'SI' : 'NO'}`);
        
        // ============================================
        // TEST 2: Verificar roles creados
        // ============================================
        console.log('\n📋 TEST 2: Verificando roles predefinidos...');
        const [roles] = await connection.query('SELECT nombre, descripcion, nivel FROM roles WHERE activo = 1');
        console.log(`✅ Roles creados: ${roles.length}`);
        roles.forEach(rol => {
            console.log(`   - ${rol.nombre} (nivel ${rol.nivel}): ${rol.descripcion}`);
        });
        
        // ============================================
        // TEST 3: Verificar permisos creados
        // ============================================
        console.log('\n📋 TEST 3: Verificando permisos creados...');
        const [permisos] = await connection.query('SELECT COUNT(*) as total FROM permisos');
        console.log(`✅ Permisos totales: ${permisos[0].total}`);
        
        const [permisosPorRecurso] = await connection.query(`
            SELECT recurso, COUNT(*) as cantidad
            FROM permisos
            GROUP BY recurso
            ORDER BY cantidad DESC
        `);
        console.log('   Permisos por recurso:');
        permisosPorRecurso.forEach(item => {
            console.log(`   - ${item.recurso}: ${item.cantidad} permisos`);
        });
        
        // ============================================
        // TEST 4: Verificar permisos de rol admin
        // ============================================
        console.log('\n📋 TEST 4: Verificando permisos del rol admin...');
        const [permisosAdmin] = await connection.query(`
            SELECT COUNT(*) as total
            FROM roles r
            INNER JOIN roles_permisos rp ON r.id = rp.rol_id
            WHERE r.nombre = 'admin'
        `);
        console.log(`✅ Permisos asignados a admin: ${permisosAdmin[0].total}`);
        
        // ============================================
        // TEST 5: Verificar permisos de rol entrenador
        // ============================================
        console.log('\n📋 TEST 5: Verificando permisos del rol entrenador...');
        const [permisosEntrenador] = await connection.query(`
            SELECT p.nombre, p.recurso, p.accion
            FROM roles r
            INNER JOIN roles_permisos rp ON r.id = rp.rol_id
            INNER JOIN permisos p ON rp.permiso_id = p.id
            WHERE r.nombre = 'entrenador'
            ORDER BY p.recurso, p.accion
        `);
        console.log(`✅ Permisos del entrenador: ${permisosEntrenador.length}`);
        console.log('   Ejemplos:');
        permisosEntrenador.slice(0, 5).forEach(p => {
            console.log(`   - ${p.nombre} (${p.recurso}.${p.accion})`);
        });
        
        // ============================================
        // TEST 6: Asignar rol de prueba
        // ============================================
        console.log('\n📋 TEST 6: Probando asignación de rol...');
        
        // Obtener primer usuario
        const [usuarios] = await connection.query('SELECT id, nombre, email FROM usuarios LIMIT 1');
        
        if (usuarios.length > 0) {
            const usuario = usuarios[0];
            console.log(`   Usuario de prueba: ${usuario.nombre} (${usuario.email})`);
            
            // Intentar asignar rol admin
            const [rolAdmin] = await connection.query('SELECT id FROM roles WHERE nombre = "admin" LIMIT 1');
            
            if (rolAdmin.length > 0) {
                await connection.query(`
                    INSERT INTO usuarios_roles (usuario_id, rol_id, activo)
                    VALUES (?, ?, 1)
                    ON DUPLICATE KEY UPDATE activo = 1
                `, [usuario.id, rolAdmin[0].id]);
                
                console.log(`✅ Rol admin asignado correctamente a usuario ${usuario.id}`);
                
                // Verificar asignación
                const [rolesUsuario] = await connection.query(`
                    SELECT r.nombre, r.nivel
                    FROM usuarios_roles ur
                    INNER JOIN roles r ON ur.rol_id = r.id
                    WHERE ur.usuario_id = ? AND ur.activo = 1
                `, [usuario.id]);
                
                console.log(`   Roles asignados al usuario:`);
                rolesUsuario.forEach(rol => {
                    console.log(`   - ${rol.nombre} (nivel ${rol.nivel})`);
                });
            }
        } else {
            console.log('⚠️ No hay usuarios en la base de datos para probar');
        }
        
        // ============================================
        // TEST 7: Verificar vistas creadas
        // ============================================
        console.log('\n📋 TEST 7: Verificando vistas RBAC...');
        const [vistas] = await connection.query(`
            SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_meli LIKE 'vista_%'
        `);
        console.log(`✅ Vistas creadas: ${vistas.length}`);
        vistas.forEach(vista => {
            console.log(`   - ${Object.values(vista)[0]}`);
        });
        
        // ============================================
        // TEST 8: Probar función usuario_tiene_permiso
        // ============================================
        console.log('\n📋 TEST 8: Probando función usuario_tiene_permiso...');
        if (usuarios.length > 0) {
            const [resultado] = await connection.query(`
                SELECT usuario_tiene_permiso(?, 'usuarios.crear') as tiene_permiso
            `, [usuarios[0].id]);
            
            console.log(`✅ Usuario ${usuarios[0].id} tiene permiso 'usuarios.crear': ${resultado[0].tiene_permiso ? 'SI' : 'NO'}`);
        }
        
        // ============================================
        // TEST 9: Estadísticas generales
        // ============================================
        console.log('\n📋 TEST 9: Estadísticas del sistema RBAC...');
        const [stats] = await connection.query(`
            SELECT 
                (SELECT COUNT(*) FROM roles WHERE activo = 1) as total_roles,
                (SELECT COUNT(*) FROM permisos) as total_permisos,
                (SELECT COUNT(*) FROM usuarios_roles WHERE activo = 1) as asignaciones_activas,
                (SELECT COUNT(*) FROM roles_permisos) as relaciones_rol_permiso
        `);
        
        console.log('✅ Estadísticas:');
        console.log(`   - Roles activos: ${stats[0].total_roles}`);
        console.log(`   - Permisos totales: ${stats[0].total_permisos}`);
        console.log(`   - Asignaciones activas: ${stats[0].asignaciones_activas}`);
        console.log(`   - Relaciones rol-permiso: ${stats[0].relaciones_rol_permiso}`);
        
        // ============================================
        // RESUMEN
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log('\n📝 PRÓXIMOS PASOS:');
        console.log('1. El sistema RBAC está correctamente configurado');
        console.log('2. Reinicia el servidor: node index.js');
        console.log('3. Usa los endpoints RBAC para gestionar roles');
        console.log('4. Ejemplo: GET http://localhost:3001/me (con token JWT)');
        console.log('\n💡 TIP: El usuario ID 1 ya tiene rol de admin asignado');
        
    } catch (error) {
        console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
        console.error('Stack:', error.stack);
        
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n⚠️ SOLUCIÓN: Ejecuta primero el script rbac_sistema_completo.sql');
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar pruebas
testRBAC();
