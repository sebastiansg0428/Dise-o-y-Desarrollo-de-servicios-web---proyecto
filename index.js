const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'meli',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==================== USUARIOS ====================

// NOTA DE SEGURIDAD: Las contraseñas deberían estar hasheadas con bcrypt
// Instalar: npm install bcrypt
// Al registrar: const hashedPassword = await bcrypt.hash(password, 10);
// Al login: const match = await bcrypt.compare(password, user.password);

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [rows] = await pool.promise().query(
            'SELECT id, nombre, apellido, email, membresia, estado, fecha_vencimiento FROM usuarios WHERE email = ? AND password = ? AND estado = "activo"',
            [email, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        const user = rows[0];
        
        // Actualizar última visita
        await pool.promise().query(
            'UPDATE usuarios SET ultima_visita = NOW(), total_visitas = total_visitas + 1 WHERE id = ?',
            [user.id]
        );

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Registro
app.post('/register', async (req, res) => {
    const { nombre, apellido, email, password, telefono, fecha_nacimiento, genero, membresia = 'basica' } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, message: 'Nombre, email y password son requeridos' });
    }

    const precios = { basica: 30.00, premium: 50.00, vip: 80.00 };
    const precio_membresia = precios[membresia] || 30.00;
    const fecha_vencimiento = new Date();
    fecha_vencimiento.setMonth(fecha_vencimiento.getMonth() + 1);

    try {
        const [result] = await pool.promise().query(
            `INSERT INTO usuarios (nombre, apellido, email, password, telefono, fecha_nacimiento, genero, membresia, precio_membresia, fecha_vencimiento, ultima_visita) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [nombre, apellido, email, password, telefono, fecha_nacimiento, genero, membresia, precio_membresia, fecha_vencimiento]
        );

        res.status(201).json({ 
            success: true, 
            id: result.insertId,
            message: 'Usuario registrado exitosamente'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El email ya existe' });
        }
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Listar usuarios
app.get('/usuarios', async (req, res) => {
    const { estado, membresia, vencidos } = req.query;
    
    let query = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, u.membresia, u.estado, 
               u.precio_membresia, u.total_visitas,
               DATE_FORMAT(u.ultima_visita, "%d/%m/%Y %H:%i") as ultima_visita,
               DATE_FORMAT(u.fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento,
               DATE_FORMAT(u.created_at, "%d/%m/%Y") as fecha_registro,
               CASE WHEN u.fecha_vencimiento < CURDATE() THEN 'vencida' ELSE 'vigente' END as estado_membresia
        FROM usuarios u WHERE 1=1
    `;
    
    const params = [];
    
    if (estado) {
        query += ' AND u.estado = ?';
        params.push(estado);
    }
    
    if (membresia) {
        query += ' AND u.membresia = ?';
        params.push(membresia);
    }
    
    if (vencidos === 'true') {
        query += ' AND u.fecha_vencimiento < CURDATE()';
    }
    
    query += ' ORDER BY u.id DESC';

    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ver usuario individual
app.get('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [userRows] = await pool.promise().query(
            `SELECT u.*, DATE_FORMAT(u.ultima_visita, "%d/%m/%Y %H:%i") as ultima_visita_formatted,
                    DATE_FORMAT(u.fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento_formatted,
                    CASE WHEN u.fecha_vencimiento < CURDATE() THEN 'vencida' ELSE 'vigente' END as estado_membresia
             FROM usuarios u WHERE u.id = ?`, [id]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(userRows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar usuario
app.put('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, fecha_nacimiento, genero, membresia } = req.body;
    
    const updates = [];
    const values = [];
    
    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (apellido) { updates.push('apellido = ?'); values.push(apellido); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (telefono) { updates.push('telefono = ?'); values.push(telefono); }
    if (fecha_nacimiento) { updates.push('fecha_nacimiento = ?'); values.push(fecha_nacimiento); }
    if (genero) { updates.push('genero = ?'); values.push(genero); }
    if (membresia) { 
        updates.push('membresia = ?', 'precio_membresia = ?'); 
        values.push(membresia);
        const precios = { basica: 30.00, premium: 50.00, vip: 80.00 };
        values.push(precios[membresia] || 30.00);
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    values.push(id);

    try {
        const [result] = await pool.promise().query(
            `UPDATE usuarios SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, 
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Email ya existe' });
        }
        res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
    }
});

// Cambiar estado de usuario
app.put('/usuarios/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!['activo', 'inactivo', 'suspendido'].includes(estado)) {
        return res.status(400).json({ success: false, message: 'Estado inválido' });
    }
    
    try {
        const [result] = await pool.promise().query(
            'UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, message: `Usuario ${estado}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al cambiar estado' });
    }
});

// Eliminar usuario
app.delete('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [result] = await pool.promise().query('DELETE FROM usuarios WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
});

// Registrar visita
app.post('/usuarios/:id/visita', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Verificar usuario activo y membresía vigente
        const [user] = await pool.promise().query(
            'SELECT nombre, estado, fecha_vencimiento FROM usuarios WHERE id = ? AND estado = "activo"',
            [id]
        );
        
        if (user.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado o inactivo' });
        }
        
        if (new Date(user[0].fecha_vencimiento) < new Date()) {
            return res.status(403).json({ success: false, message: 'Membresía vencida' });
        }
        
        // Actualizar visita
        await pool.promise().query(
            'UPDATE usuarios SET ultima_visita = NOW(), total_visitas = total_visitas + 1 WHERE id = ?',
            [id]
        );
        
        res.json({ 
            success: true, 
            message: `Bienvenido ${user[0].nombre}` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar visita' });
    }
});

// Estadísticas
app.get('/usuarios/estadisticas', async (req, res) => {
    try {
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_usuarios,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as usuarios_activos,
                SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as usuarios_inactivos,
                SUM(CASE WHEN estado = 'suspendido' THEN 1 ELSE 0 END) as usuarios_suspendidos,
                SUM(CASE WHEN membresia = 'basica' THEN 1 ELSE 0 END) as membresia_basica,
                SUM(CASE WHEN membresia = 'premium' THEN 1 ELSE 0 END) as membresia_premium,
                SUM(CASE WHEN membresia = 'vip' THEN 1 ELSE 0 END) as membresia_vip,
                SUM(CASE WHEN fecha_vencimiento < CURDATE() THEN 1 ELSE 0 END) as membresias_vencidas,
                COUNT(CASE WHEN DATE(ultima_visita) = CURDATE() THEN 1 END) as visitas_hoy,
                SUM(precio_membresia) as ingresos_mensuales_potenciales,
                AVG(total_visitas) as promedio_visitas_usuario
            FROM usuarios
        `);
        
        const [visitasSemanales] = await pool.promise().query(`
            SELECT COUNT(*) as visitas_semana
            FROM usuarios 
            WHERE ultima_visita >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        res.json({
            ...stats[0],
            visitas_semana: visitasSemanales[0].visitas_semana
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PRODUCTOS ====================

// Listar productos
app.get('/productos', async (req, res) => {
    const { categoria, estado, stock_bajo } = req.query;
    
    let query = `
        SELECT p.*, 
               (p.precio_venta - p.precio_compra) as ganancia_unitaria,
               ((p.precio_venta - p.precio_compra) * p.stock) as ganancia_total_stock,
               CASE WHEN p.stock <= p.stock_minimo THEN 'bajo' ELSE 'normal' END as estado_stock
        FROM productos p WHERE 1=1
    `;
    
    const params = [];
    
    if (categoria) {
        query += ' AND p.categoria = ?';
        params.push(categoria);
    }
    
    if (estado) {
        query += ' AND p.estado = ?';
        params.push(estado);
    }
    
    if (stock_bajo === 'true') {
        query += ' AND p.stock <= p.stock_minimo';
    }
    
    query += ' ORDER BY p.nombre';

    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ver producto individual
app.get('/productos/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rows] = await pool.promise().query(
            `SELECT p.*, 
                    (p.precio_venta - p.precio_compra) as ganancia_unitaria,
                    ((p.precio_venta - p.precio_compra) * p.stock) as ganancia_total_stock
             FROM productos p WHERE p.id = ?`, [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear producto
app.post('/productos', async (req, res) => {
    const { nombre, descripcion, categoria, stock, stock_minimo, precio_compra, precio_venta } = req.body;
    
    if (!nombre || !precio_compra || !precio_venta) {
        return res.status(400).json({ success: false, message: 'Nombre, precio de compra y venta son requeridos' });
    }
    
    try {
        const [result] = await pool.promise().query(
            `INSERT INTO productos (nombre, descripcion, categoria, stock, stock_minimo, precio_compra, precio_venta) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion, categoria || 'suplementos', stock || 0, stock_minimo || 5, precio_compra, precio_venta]
        );

        res.status(201).json({ 
            success: true, 
            id: result.insertId,
            message: 'Producto creado exitosamente'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear producto' });
    }
});

// Actualizar producto
app.put('/productos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, categoria, stock, stock_minimo, precio_compra, precio_venta, estado } = req.body;
    
    const updates = [];
    const values = [];
    
    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (descripcion !== undefined) { updates.push('descripcion = ?'); values.push(descripcion); }
    if (categoria) { updates.push('categoria = ?'); values.push(categoria); }
    if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
    if (stock_minimo !== undefined) { updates.push('stock_minimo = ?'); values.push(stock_minimo); }
    if (precio_compra !== undefined) { updates.push('precio_compra = ?'); values.push(precio_compra); }
    if (precio_venta !== undefined) { updates.push('precio_venta = ?'); values.push(precio_venta); }
    if (estado) { updates.push('estado = ?'); values.push(estado); }
    
    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    values.push(id);

    try {
        const [result] = await pool.promise().query(
            `UPDATE productos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, 
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
        
        res.json({ success: true, message: 'Producto actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar producto' });
    }
});

// Eliminar producto
app.delete('/productos/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [result] = await pool.promise().query('DELETE FROM productos WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
        
        res.json({ success: true, message: 'Producto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar producto' });
    }
});

// Vender producto (con transacción para garantizar atomicidad)
app.post('/productos/:id/vender', async (req, res) => {
    const { id } = req.params;
    const { cantidad, usuario_id, metodo_pago = 'efectivo' } = req.body;
    
    if (!cantidad || cantidad <= 0) {
        return res.status(400).json({ success: false, message: 'Cantidad inválida' });
    }
    
    const connection = await pool.promise().getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Verificar producto y stock con bloqueo
        const [producto] = await connection.query(
            'SELECT nombre, stock, precio_venta FROM productos WHERE id = ? AND estado = "activo" FOR UPDATE',
            [id]
        );
        
        if (producto.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Producto no encontrado o inactivo' });
        }
        
        if (producto[0].stock < cantidad) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Stock insuficiente. Disponible: ${producto[0].stock}` });
        }
        
        const total = producto[0].precio_venta * cantidad;
        
        // Registrar venta
        await connection.query(
            'INSERT INTO ventas (usuario_id, producto_id, cantidad, precio_unitario, total, metodo_pago) VALUES (?, ?, ?, ?, ?, ?)',
            [usuario_id, id, cantidad, producto[0].precio_venta, total, metodo_pago]
        );
        
        // Actualizar stock
        await connection.query(
            'UPDATE productos SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
            [cantidad, id]
        );
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: `Venta registrada: ${cantidad} x ${producto[0].nombre}`,
            total: total,
            stock_restante: producto[0].stock - cantidad
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en venta:', error);
        res.status(500).json({ success: false, message: 'Error al procesar venta', error: error.message });
    } finally {
        connection.release();
    }
});

// Estadísticas de productos
app.get('/productos/estadisticas', async (req, res) => {
    try {
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_productos,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as productos_activos,
                SUM(CASE WHEN stock <= stock_minimo THEN 1 ELSE 0 END) as productos_stock_bajo,
                SUM(stock * precio_compra) as valor_inventario_compra,
                SUM(stock * precio_venta) as valor_inventario_venta,
                SUM((precio_venta - precio_compra) * stock) as ganancia_potencial_total
            FROM productos
        `);
        
        const [ventasHoy] = await pool.promise().query(`
            SELECT 
                COUNT(*) as ventas_hoy,
                SUM(total) as ingresos_hoy
            FROM ventas 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        res.json({
            ...stats[0],
            ...ventasHoy[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Historial de ventas
app.get('/ventas', async (req, res) => {
    const { fecha_desde, fecha_hasta, usuario_id } = req.query;
    
    let query = `
        SELECT v.*, p.nombre as producto_nombre, u.nombre as usuario_nombre,
               DATE_FORMAT(v.created_at, "%d/%m/%Y %H:%i") as fecha_venta
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (fecha_desde) {
        query += ' AND DATE(v.created_at) >= ?';
        params.push(fecha_desde);
    }
    
    if (fecha_hasta) {
        query += ' AND DATE(v.created_at) <= ?';
        params.push(fecha_hasta);
    }
    
    if (usuario_id) {
        query += ' AND v.usuario_id = ?';
        params.push(usuario_id);
    }
    
    query += ' ORDER BY v.created_at DESC LIMIT 100';

    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ENTRENADORES ====================

// Estadísticas de entrenadores (DEBE IR ANTES de /entrenadores/:id)
app.get('/entrenadores/estadisticas', async (req, res) => {
    try {
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_entrenadores,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as entrenadores_activos,
                AVG(tarifa_rutina) as tarifa_promedio
            FROM entrenadores
        `);

        const [ranking] = await pool.promise().query(`
            SELECT e.id, e.nombre, e.apellido, e.especialidad_principal,
                   COALESCE(AVG(v.puntuacion), 0) as promedio_puntuacion,
                   COUNT(DISTINCT ec.usuario_id) as total_clientes
            FROM entrenadores e
            LEFT JOIN valoraciones_entrenadores v ON v.entrenador_id = e.id
            LEFT JOIN entrenadores_clientes ec ON ec.entrenador_id = e.id
            WHERE e.estado = 'activo'
            GROUP BY e.id
            ORDER BY promedio_puntuacion DESC, total_clientes DESC
            LIMIT 5
        `);

        res.json({ ...stats[0], top_entrenadores: ranking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar entrenadores con métricas
app.get('/entrenadores', async (req, res) => {
    const { especialidad, estado } = req.query;

    let query = `
        SELECT e.id, e.nombre, e.apellido, e.email, e.telefono, e.genero, e.fecha_nacimiento,
               e.especialidad_principal, e.experiencia_anios, e.certificaciones, e.biografia,
               e.tarifa_rutina, e.estado,
               DATE_FORMAT(e.created_at, "%d/%m/%Y") as fecha_alta,
               COALESCE(AVG(v.puntuacion), 0) as promedio_puntuacion,
               COALESCE(COUNT(DISTINCT ec.usuario_id), 0) as total_clientes
        FROM entrenadores e
        LEFT JOIN valoraciones_entrenadores v ON v.entrenador_id = e.id
        LEFT JOIN entrenadores_clientes ec ON ec.entrenador_id = e.id AND ec.estado = 'activo'
        WHERE 1=1
    `;

    const params = [];

    if (especialidad) {
        query += ' AND e.especialidad_principal = ?';
        params.push(especialidad);
    }
    if (estado) {
        query += ' AND e.estado = ?';
        params.push(estado);
    }

    query += ' GROUP BY e.id ORDER BY promedio_puntuacion DESC, e.experiencia_anios DESC';

    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ver entrenador individual (con horarios y métricas)
app.get('/entrenadores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [entrenadores] = await pool.promise().query(
            `SELECT e.*, COALESCE(AVG(v.puntuacion), 0) as promedio_puntuacion,
                    COALESCE(COUNT(DISTINCT ec.usuario_id), 0) as total_clientes
             FROM entrenadores e
             LEFT JOIN valoraciones_entrenadores v ON v.entrenador_id = e.id
             LEFT JOIN entrenadores_clientes ec ON ec.entrenador_id = e.id
             WHERE e.id = ?
             GROUP BY e.id`,
            [id]
        );

        if (entrenadores.length === 0) {
            return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
        }

        const [horarios] = await pool.promise().query(
            'SELECT * FROM entrenadores_horarios WHERE entrenador_id = ? ORDER BY FIELD(dia_semana, "lunes","martes","miercoles","jueves","viernes","sabado","domingo"), hora_inicio',
            [id]
        );

        res.json({
            ...entrenadores[0],
            horarios
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear entrenador
app.post('/entrenadores', async (req, res) => {
    const { nombre, apellido, email, telefono, genero, fecha_nacimiento, especialidad_principal, experiencia_anios, certificaciones, biografia, tarifa_rutina } = req.body;

    if (!nombre || !email) {
        return res.status(400).json({ success: false, message: 'Nombre y email son requeridos' });
    }

    try {
        const [result] = await pool.promise().query(
            `INSERT INTO entrenadores (nombre, apellido, email, telefono, genero, fecha_nacimiento, especialidad_principal, experiencia_anios, certificaciones, biografia, tarifa_rutina, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
            [nombre, apellido, email, telefono, genero, fecha_nacimiento, especialidad_principal || 'fuerza', experiencia_anios || 0, certificaciones, biografia, tarifa_rutina || 0.00]
        );

        // Obtener el entrenador recién creado con todas sus métricas
        const [nuevoEntrenador] = await pool.promise().query(
            `SELECT e.id, e.nombre, e.apellido, e.email, e.telefono, e.genero, e.fecha_nacimiento,
                    e.especialidad_principal, e.experiencia_anios, e.certificaciones, e.biografia,
                    e.tarifa_rutina, e.estado,
                    DATE_FORMAT(e.created_at, "%d/%m/%Y") as fecha_alta,
                    COALESCE(AVG(v.puntuacion), 0) as promedio_puntuacion,
                    COALESCE(COUNT(DISTINCT ec.usuario_id), 0) as total_clientes
             FROM entrenadores e
             LEFT JOIN valoraciones_entrenadores v ON v.entrenador_id = e.id
             LEFT JOIN entrenadores_clientes ec ON ec.entrenador_id = e.id AND ec.estado = 'activo'
             WHERE e.id = ?
             GROUP BY e.id`,
            [result.insertId]
        );

        res.status(201).json({ 
            success: true, 
            id: result.insertId,
            message: 'Entrenador creado exitosamente',
            entrenador: nuevoEntrenador[0]
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El email de entrenador ya existe' });
        }
        console.error('Error al crear entrenador:', error);
        res.status(500).json({ success: false, message: 'Error al crear entrenador', error: error.message });
    }
});

// Actualizar entrenador
app.put('/entrenadores/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, genero, fecha_nacimiento, especialidad_principal, experiencia_anios, certificaciones, biografia, tarifa_rutina, estado } = req.body;

    const updates = [];
    const values = [];

    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (apellido) { updates.push('apellido = ?'); values.push(apellido); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (telefono) { updates.push('telefono = ?'); values.push(telefono); }
    if (genero) { updates.push('genero = ?'); values.push(genero); }
    if (fecha_nacimiento) { updates.push('fecha_nacimiento = ?'); values.push(fecha_nacimiento); }
    if (especialidad_principal) { updates.push('especialidad_principal = ?'); values.push(especialidad_principal); }
    if (experiencia_anios !== undefined) { updates.push('experiencia_anios = ?'); values.push(experiencia_anios); }
    if (certificaciones !== undefined) { updates.push('certificaciones = ?'); values.push(certificaciones); }
    if (biografia !== undefined) { updates.push('biografia = ?'); values.push(biografia); }
    if (tarifa_rutina !== undefined) { updates.push('tarifa_rutina = ?'); values.push(tarifa_rutina); }
    if (estado) { updates.push('estado = ?'); values.push(estado); }

    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    values.push(id);

    try {
        const [result] = await pool.promise().query(
            `UPDATE entrenadores SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
        }
        res.json({ success: true, message: 'Entrenador actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar entrenador' });
    }
});

// Eliminar entrenador
app.delete('/entrenadores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.promise().query('DELETE FROM entrenadores WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
        }
        res.json({ success: true, message: 'Entrenador eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar entrenador' });
    }
});

// Horarios del entrenador
app.get('/entrenadores/:id/horarios', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM entrenadores_horarios WHERE entrenador_id = ? ORDER BY dia_semana, hora_inicio', [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/entrenadores/:id/horarios', async (req, res) => {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, disponible } = req.body;

    if (!dia_semana || !hora_inicio || !hora_fin) {
        return res.status(400).json({ success: false, message: 'dia_semana, hora_inicio y hora_fin son requeridos' });
    }

    // Validar que hora_fin sea mayor que hora_inicio
    if (hora_inicio >= hora_fin) {
        return res.status(400).json({ success: false, message: 'La hora de fin debe ser posterior a la hora de inicio' });
    }

    try {
        // Verificar que no exista solapamiento de horarios
        const [solapados] = await pool.promise().query(
            `SELECT id FROM entrenadores_horarios 
             WHERE entrenador_id = ? AND dia_semana = ? 
             AND ((hora_inicio < ? AND hora_fin > ?) 
                  OR (hora_inicio < ? AND hora_fin > ?)
                  OR (hora_inicio >= ? AND hora_fin <= ?))`,
            [id, dia_semana, hora_fin, hora_inicio, hora_fin, hora_fin, hora_inicio, hora_fin]
        );

        if (solapados.length > 0) {
            return res.status(409).json({ success: false, message: 'El horario se solapa con otro existente' });
        }

        const [result] = await pool.promise().query(
            `INSERT INTO entrenadores_horarios (entrenador_id, dia_semana, hora_inicio, hora_fin, disponible)
             VALUES (?, ?, ?, ?, COALESCE(?, 1))`,
            [id, dia_semana, hora_inicio, hora_fin, disponible]
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Horario creado exitosamente' });
    } catch (error) {
        console.error('Error al crear horario:', error);
        res.status(500).json({ success: false, message: 'Error al crear horario', error: error.message });
    }
});

app.delete('/entrenadores/:id/horarios/:horario_id', async (req, res) => {
    const { id, horario_id } = req.params;
    try {
        const [result] = await pool.promise().query('DELETE FROM entrenadores_horarios WHERE entrenador_id = ? AND id = ?', [id, horario_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Horario no encontrado' });
        }
        res.json({ success: true, message: 'Horario eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar horario' });
    }
});

// Asignación de clientes a entrenador
app.post('/entrenadores/:entrenador_id/clientes/:usuario_id', async (req, res) => {
    const { entrenador_id, usuario_id } = req.params;
    const { notas } = req.body;
    try {
        const [result] = await pool.promise().query(
            `INSERT INTO entrenadores_clientes (entrenador_id, usuario_id, notas)
             VALUES (?, ?, ?)`,
            [entrenador_id, usuario_id, notas]
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Cliente asignado al entrenador' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El cliente ya está asignado a este entrenador' });
        }
        res.status(500).json({ success: false, message: 'Error al asignar cliente' });
    }
});

app.get('/entrenadores/:entrenador_id/clientes', async (req, res) => {
    const { entrenador_id } = req.params;
    const { estado } = req.query;
    let query = `
        SELECT ec.id as asignacion_id, ec.estado, ec.fecha_asignacion, ec.notas,
               u.id as usuario_id, u.nombre, u.apellido, u.email, u.membresia
        FROM entrenadores_clientes ec
        INNER JOIN usuarios u ON u.id = ec.usuario_id
        WHERE ec.entrenador_id = ?
    `;
    const params = [entrenador_id];
    if (estado) { query += ' AND ec.estado = ?'; params.push(estado); }
    query += ' ORDER BY ec.fecha_asignacion DESC';
    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/entrenadores/:entrenador_id/clientes/:usuario_id', async (req, res) => {
    const { entrenador_id, usuario_id } = req.params;
    try {
        const [result] = await pool.promise().query('DELETE FROM entrenadores_clientes WHERE entrenador_id = ? AND usuario_id = ?', [entrenador_id, usuario_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
        }
        res.json({ success: true, message: 'Cliente desasignado del entrenador' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al desasignar cliente' });
    }
});

// Sesiones de entrenamiento
app.post('/entrenadores/:entrenador_id/sesiones', async (req, res) => {
    const { entrenador_id } = req.params;
    const { usuario_id, rutina_id, fecha, duracion_minutos, tipo, ubicacion, notas } = req.body;

    if (!usuario_id || !fecha) {
        return res.status(400).json({ success: false, message: 'usuario_id y fecha son requeridos' });
    }

    try {
        // Verificar que el entrenador esté activo
        const [entrenador] = await pool.promise().query(
            'SELECT estado FROM entrenadores WHERE id = ?', [entrenador_id]
        );
        
        if (entrenador.length === 0) {
            return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
        }
        
        if (entrenador[0].estado !== 'activo') {
            return res.status(400).json({ success: false, message: 'El entrenador no está activo' });
        }

        // Verificar que el usuario exista y esté activo
        const [usuario] = await pool.promise().query(
            'SELECT estado FROM usuarios WHERE id = ?', [usuario_id]
        );
        
        if (usuario.length === 0 || usuario[0].estado !== 'activo') {
            return res.status(400).json({ success: false, message: 'Usuario no encontrado o inactivo' });
        }

        // Verificar conflictos de horario del entrenador
        const duracion = duracion_minutos || 60;
        const [conflictos] = await pool.promise().query(
            `SELECT id FROM sesiones_entrenamiento 
             WHERE entrenador_id = ? 
             AND estado NOT IN ('cancelada', 'completada')
             AND (
                 (fecha <= ? AND DATE_ADD(fecha, INTERVAL duracion_minutos MINUTE) > ?)
                 OR (fecha < DATE_ADD(?, INTERVAL ? MINUTE) AND fecha >= ?)
             )`,
            [entrenador_id, fecha, fecha, fecha, duracion, fecha]
        );

        if (conflictos.length > 0) {
            return res.status(409).json({ success: false, message: 'El entrenador ya tiene una sesión programada en ese horario' });
        }

        const [result] = await pool.promise().query(
            `INSERT INTO sesiones_entrenamiento (entrenador_id, usuario_id, rutina_id, fecha, duracion_minutos, tipo, ubicacion, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [entrenador_id, usuario_id, rutina_id || null, fecha, duracion, tipo || 'personal', ubicacion || 'gimnasio', notas]
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Sesión creada exitosamente' });
    } catch (error) {
        console.error('Error al crear sesión:', error);
        res.status(500).json({ success: false, message: 'Error al crear sesión', error: error.message });
    }
});

app.get('/entrenadores/:entrenador_id/sesiones', async (req, res) => {
    const { entrenador_id } = req.params;
    const { estado, desde, hasta } = req.query;
    let query = `
        SELECT s.*, u.nombre as usuario_nombre, r.nombre as rutina_nombre,
               DATE_FORMAT(s.fecha, "%d/%m/%Y %H:%i") as fecha_programada
        FROM sesiones_entrenamiento s
        LEFT JOIN usuarios u ON u.id = s.usuario_id
        LEFT JOIN rutinas r ON r.id = s.rutina_id
        WHERE s.entrenador_id = ?
    `;
    const params = [entrenador_id];
    if (estado) { query += ' AND s.estado = ?'; params.push(estado); }
    if (desde) { query += ' AND DATE(s.fecha) >= ?'; params.push(desde); }
    if (hasta) { query += ' AND DATE(s.fecha) <= ?'; params.push(hasta); }
    query += ' ORDER BY s.fecha DESC';
    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar sesión
app.put('/sesiones/:id', async (req, res) => {
    const { id } = req.params;
    const { estado, duracion_minutos, ubicacion, notas, calorias_estimadas } = req.body;

    const updates = [];
    const values = [];
    if (estado) { updates.push('estado = ?'); values.push(estado); }
    if (duracion_minutos !== undefined) { updates.push('duracion_minutos = ?'); values.push(duracion_minutos); }
    if (ubicacion) { updates.push('ubicacion = ?'); values.push(ubicacion); }
    if (notas !== undefined) { updates.push('notas = ?'); values.push(notas); }
    if (calorias_estimadas !== undefined) { updates.push('calorias_estimadas = ?'); values.push(calorias_estimadas); }

    if (estado === 'completada') {
        updates.push('updated_at = NOW()');
    }

    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    values.push(id);
    try {
        const [result] = await pool.promise().query(`UPDATE sesiones_entrenamiento SET ${updates.join(', ')} WHERE id = ?`, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
        }
        res.json({ success: true, message: 'Sesión actualizada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar sesión' });
    }
});

// Valoraciones de entrenadores
app.post('/entrenadores/:entrenador_id/valoraciones', async (req, res) => {
    const { entrenador_id } = req.params;
    const { usuario_id, puntuacion, comentario } = req.body;
    if (!usuario_id || !puntuacion) {
        return res.status(400).json({ success: false, message: 'usuario_id y puntuacion son requeridos' });
    }
    try {
        const [result] = await pool.promise().query(
            `INSERT INTO valoraciones_entrenadores (entrenador_id, usuario_id, puntuacion, comentario)
             VALUES (?, ?, ?, ?)`,
            [entrenador_id, usuario_id, puntuacion, comentario]
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Valoración registrada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar valoración' });
    }
});

app.get('/entrenadores/:entrenador_id/valoraciones', async (req, res) => {
    const { entrenador_id } = req.params;
    try {
        const [rows] = await pool.promise().query(
            `SELECT v.*, u.nombre as usuario_nombre
             FROM valoraciones_entrenadores v
             INNER JOIN usuarios u ON u.id = v.usuario_id
             WHERE v.entrenador_id = ?
             ORDER BY v.created_at DESC`,
            [entrenador_id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== EJERCICIOS ====================

// Listar ejercicios
app.get('/ejercicios', async (req, res) => {
    const { grupo_muscular, tipo, nivel, estado } = req.query;
    
    let query = `
        SELECT id, nombre, descripcion, grupo_muscular, tipo, nivel, equipo, 
               calorias_x_minuto, video_url, estado,
               DATE_FORMAT(created_at, "%d/%m/%Y") as fecha_creacion
        FROM ejercicios WHERE 1=1
    `;
    
    const params = [];
    
    if (grupo_muscular) {
        query += ' AND grupo_muscular = ?';
        params.push(grupo_muscular);
    }
    
    if (tipo) {
        query += ' AND tipo = ?';
        params.push(tipo);
    }
    
    if (nivel) {
        query += ' AND nivel = ?';
        params.push(nivel);
    }
    
    if (estado) {
        query += ' AND estado = ?';
        params.push(estado);
    } else {
        query += ' AND estado = "activo"';
    }
    
    query += ' ORDER BY grupo_muscular, nombre';

    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ver ejercicio individual
app.get('/ejercicios/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rows] = await pool.promise().query(
            'SELECT * FROM ejercicios WHERE id = ?', [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ejercicio no encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear ejercicio
app.post('/ejercicios', async (req, res) => {
    const { nombre, descripcion, grupo_muscular, tipo, nivel, equipo, video_url, calorias_x_minuto } = req.body;
    
    if (!nombre || !grupo_muscular) {
        return res.status(400).json({ success: false, message: 'Nombre y grupo muscular son requeridos' });
    }

    try {
        const [result] = await pool.promise().query(
            `INSERT INTO ejercicios (nombre, descripcion, grupo_muscular, tipo, nivel, equipo, video_url, calorias_x_minuto) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion, grupo_muscular, tipo || 'fuerza', nivel || 'principiante', equipo, video_url, calorias_x_minuto || 5.00]
        );

        res.status(201).json({ 
            success: true, 
            id: result.insertId,
            message: 'Ejercicio creado exitosamente'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear ejercicio' });
    }
});

// Actualizar ejercicio
app.put('/ejercicios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, grupo_muscular, tipo, nivel, equipo, video_url, calorias_x_minuto, estado } = req.body;
    
    const updates = [];
    const values = [];
    
    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (descripcion) { updates.push('descripcion = ?'); values.push(descripcion); }
    if (grupo_muscular) { updates.push('grupo_muscular = ?'); values.push(grupo_muscular); }
    if (tipo) { updates.push('tipo = ?'); values.push(tipo); }
    if (nivel) { updates.push('nivel = ?'); values.push(nivel); }
    if (equipo) { updates.push('equipo = ?'); values.push(equipo); }
    if (video_url) { updates.push('video_url = ?'); values.push(video_url); }
    if (calorias_x_minuto !== undefined) { updates.push('calorias_x_minuto = ?'); values.push(calorias_x_minuto); }
    if (estado) { updates.push('estado = ?'); values.push(estado); }
    
    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    values.push(id);

    try {
        const [result] = await pool.promise().query(
            `UPDATE ejercicios SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, 
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Ejercicio no encontrado' });
        }
        
        res.json({ success: true, message: 'Ejercicio actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar ejercicio' });
    }
});

// Eliminar ejercicio
app.delete('/ejercicios/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [result] = await pool.promise().query('DELETE FROM ejercicios WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Ejercicio no encontrado' });
        }
        
        res.json({ success: true, message: 'Ejercicio eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar ejercicio' });
    }
});

// ==================== RUTINAS ====================

// Listar rutinas
app.get('/rutinas', async (req, res) => {
    const { objetivo, nivel, tipo, usuario_id } = req.query;
    
    let query = `
        SELECT r.id, r.nombre, r.descripcion, r.objetivo, r.nivel, r.duracion_estimada,
               r.frecuencia_semanal, r.tipo, r.usuario_id, r.popularidad, r.imagen_url, r.estado,
               DATE_FORMAT(r.created_at, "%d/%m/%Y") as fecha_creacion,
               COUNT(DISTINCT re.ejercicio_id) as total_ejercicios,
               u.nombre as creador_nombre
        FROM rutinas r
        LEFT JOIN rutinas_ejercicios re ON r.id = re.rutina_id
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.estado = 'activo'
    `;
    
    const params = [];
    
    if (objetivo) {
        query += ' AND r.objetivo = ?';
        params.push(objetivo);
    }
    
    if (nivel) {
        query += ' AND r.nivel = ?';
        params.push(nivel);
    }
    
    if (tipo) {
        query += ' AND r.tipo = ?';
        params.push(tipo);
    }
    
    if (usuario_id) {
        query += ' AND r.usuario_id = ?';
        params.push(usuario_id);
    }
    
    query += ' GROUP BY r.id ORDER BY r.popularidad DESC, r.created_at DESC';

    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ver rutina completa con ejercicios
app.get('/rutinas/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Obtener información de la rutina
        const [rutina] = await pool.promise().query(
            `SELECT r.*, u.nombre as creador_nombre, u.email as creador_email
             FROM rutinas r
             LEFT JOIN usuarios u ON r.usuario_id = u.id
             WHERE r.id = ?`, 
            [id]
        );
        
        if (rutina.length === 0) {
            return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
        }
        
        // Obtener ejercicios de la rutina
        const [ejercicios] = await pool.promise().query(
            `SELECT 
                re.id as rutina_ejercicio_id,
                re.orden, re.series, re.repeticiones, re.descanso, re.peso_sugerido, re.notas,
                e.id as ejercicio_id, e.nombre, e.descripcion, e.grupo_muscular, 
                e.tipo, e.nivel, e.equipo, e.calorias_x_minuto, e.video_url
             FROM rutinas_ejercicios re
             INNER JOIN ejercicios e ON re.ejercicio_id = e.id
             WHERE re.rutina_id = ?
             ORDER BY re.orden`,
            [id]
        );
        
        res.json({
            ...rutina[0],
            ejercicios: ejercicios
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear rutina
app.post('/rutinas', async (req, res) => {
    const { 
        nombre, descripcion, objetivo, nivel, duracion_estimada, 
        frecuencia_semanal, usuario_id, tipo, imagen_url, ejercicios 
    } = req.body;
    
    if (!nombre || !objetivo || !nivel) {
        return res.status(400).json({ success: false, message: 'Nombre, objetivo y nivel son requeridos' });
    }

    try {
        // Crear rutina
        const [result] = await pool.promise().query(
            `INSERT INTO rutinas (nombre, descripcion, objetivo, nivel, duracion_estimada, 
             frecuencia_semanal, usuario_id, tipo, imagen_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion, objetivo, nivel, duracion_estimada || 60, 
             frecuencia_semanal || 3, usuario_id || null, tipo || 'publica', imagen_url]
        );

        const rutina_id = result.insertId;

        // Agregar ejercicios si se proporcionaron
        if (ejercicios && Array.isArray(ejercicios) && ejercicios.length > 0) {
            const values = ejercicios.map((ej, index) => [
                rutina_id,
                ej.ejercicio_id,
                ej.orden || index + 1,
                ej.series || 3,
                ej.repeticiones || '12',
                ej.descanso || 60,
                ej.peso_sugerido || null,
                ej.notas || null
            ]);

            await pool.promise().query(
                `INSERT INTO rutinas_ejercicios 
                (rutina_id, ejercicio_id, orden, series, repeticiones, descanso, peso_sugerido, notas) 
                VALUES ?`,
                [values]
            );
        }

        res.status(201).json({ 
            success: true, 
            id: rutina_id,
            message: 'Rutina creada exitosamente'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear rutina', error: error.message });
    }
});

// Actualizar rutina (solo información básica)
app.put('/rutinas/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, objetivo, nivel, duracion_estimada, frecuencia_semanal, imagen_url, estado } = req.body;
    
    const updates = [];
    const values = [];
    
    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (descripcion) { updates.push('descripcion = ?'); values.push(descripcion); }
    if (objetivo) { updates.push('objetivo = ?'); values.push(objetivo); }
    if (nivel) { updates.push('nivel = ?'); values.push(nivel); }
    if (duracion_estimada !== undefined) { updates.push('duracion_estimada = ?'); values.push(duracion_estimada); }
    if (frecuencia_semanal !== undefined) { updates.push('frecuencia_semanal = ?'); values.push(frecuencia_semanal); }
    if (imagen_url) { updates.push('imagen_url = ?'); values.push(imagen_url); }
    if (estado) { updates.push('estado = ?'); values.push(estado); }
    
    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    values.push(id);

    try {
        const [result] = await pool.promise().query(
            `UPDATE rutinas SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, 
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
        }
        
        res.json({ success: true, message: 'Rutina actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar rutina' });
    }
});

// Agregar ejercicio a rutina
app.post('/rutinas/:id/ejercicios', async (req, res) => {
    const { id } = req.params;
    const { ejercicio_id, orden, series, repeticiones, descanso, peso_sugerido, notas } = req.body;
    
    if (!ejercicio_id) {
        return res.status(400).json({ success: false, message: 'ejercicio_id es requerido' });
    }

    try {
        const [result] = await pool.promise().query(
            `INSERT INTO rutinas_ejercicios 
            (rutina_id, ejercicio_id, orden, series, repeticiones, descanso, peso_sugerido, notas) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, ejercicio_id, orden || 999, series || 3, repeticiones || '12', descanso || 60, peso_sugerido, notas]
        );

        res.status(201).json({ 
            success: true, 
            id: result.insertId,
            message: 'Ejercicio agregado a la rutina'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al agregar ejercicio', error: error.message });
    }
});

// Actualizar ejercicio en rutina
app.put('/rutinas/:rutina_id/ejercicios/:ejercicio_id', async (req, res) => {
    const { rutina_id, ejercicio_id } = req.params;
    const { orden, series, repeticiones, descanso, peso_sugerido, notas } = req.body;
    
    const updates = [];
    const values = [];
    
    if (orden !== undefined) { updates.push('orden = ?'); values.push(orden); }
    if (series !== undefined) { updates.push('series = ?'); values.push(series); }
    if (repeticiones) { updates.push('repeticiones = ?'); values.push(repeticiones); }
    if (descanso !== undefined) { updates.push('descanso = ?'); values.push(descanso); }
    if (peso_sugerido) { updates.push('peso_sugerido = ?'); values.push(peso_sugerido); }
    if (notas !== undefined) { updates.push('notas = ?'); values.push(notas); }
    
    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    values.push(rutina_id, ejercicio_id);

    try {
        const [result] = await pool.promise().query(
            `UPDATE rutinas_ejercicios SET ${updates.join(', ')} WHERE rutina_id = ? AND ejercicio_id = ?`, 
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Ejercicio en rutina no encontrado' });
        }
        
        res.json({ success: true, message: 'Ejercicio actualizado en la rutina' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar ejercicio en rutina' });
    }
});

// Eliminar ejercicio de rutina
app.delete('/rutinas/:rutina_id/ejercicios/:ejercicio_id', async (req, res) => {
    const { rutina_id, ejercicio_id } = req.params;
    
    try {
        const [result] = await pool.promise().query(
            'DELETE FROM rutinas_ejercicios WHERE rutina_id = ? AND ejercicio_id = ?', 
            [rutina_id, ejercicio_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Ejercicio en rutina no encontrado' });
        }
        
        res.json({ success: true, message: 'Ejercicio eliminado de la rutina' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar ejercicio de rutina' });
    }
});

// Eliminar rutina
app.delete('/rutinas/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [result] = await pool.promise().query('DELETE FROM rutinas WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
        }
        
        res.json({ success: true, message: 'Rutina eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar rutina' });
    }
});

// Asignar rutina a usuario
app.post('/usuarios/:usuario_id/rutinas/:rutina_id', async (req, res) => {
    const { usuario_id, rutina_id } = req.params;
    const { fecha_inicio, fecha_fin, notas } = req.body;
    
    try {
        // Incrementar popularidad de la rutina
        await pool.promise().query(
            'UPDATE rutinas SET popularidad = popularidad + 1 WHERE id = ?',
            [rutina_id]
        );

        const [result] = await pool.promise().query(
            `INSERT INTO usuarios_rutinas (usuario_id, rutina_id, fecha_inicio, fecha_fin, notas, estado) 
             VALUES (?, ?, ?, ?, ?, 'asignada')`,
            [usuario_id, rutina_id, fecha_inicio, fecha_fin, notas]
        );

        res.status(201).json({ 
            success: true, 
            id: result.insertId,
            message: 'Rutina asignada al usuario'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al asignar rutina', error: error.message });
    }
});

// Ver rutinas de un usuario
app.get('/usuarios/:usuario_id/rutinas', async (req, res) => {
    const { usuario_id } = req.params;
    const { estado } = req.query;
    
    let query = `
        SELECT 
            ur.id as asignacion_id, ur.fecha_asignacion, ur.fecha_inicio, ur.fecha_fin,
            ur.estado as estado_asignacion, ur.progreso, ur.notas,
            r.id as rutina_id, r.nombre, r.descripcion, r.objetivo, r.nivel,
            r.duracion_estimada, r.frecuencia_semanal, r.imagen_url,
            COUNT(DISTINCT re.ejercicio_id) as total_ejercicios
        FROM usuarios_rutinas ur
        INNER JOIN rutinas r ON ur.rutina_id = r.id
        LEFT JOIN rutinas_ejercicios re ON r.id = re.rutina_id
        WHERE ur.usuario_id = ?
    `;
    
    const params = [usuario_id];
    
    if (estado) {
        query += ' AND ur.estado = ?';
        params.push(estado);
    }
    
    query += ' GROUP BY ur.id ORDER BY ur.fecha_asignacion DESC';

    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar progreso de rutina asignada
app.put('/usuarios/:usuario_id/rutinas/:asignacion_id', async (req, res) => {
    const { usuario_id, asignacion_id } = req.params;
    const { estado, progreso, notas } = req.body;
    
    const updates = [];
    const values = [];
    
    if (estado) { updates.push('estado = ?'); values.push(estado); }
    if (progreso !== undefined) { updates.push('progreso = ?'); values.push(progreso); }
    if (notas !== undefined) { updates.push('notas = ?'); values.push(notas); }
    
    // Auto-completar fechas según estado
    if (estado === 'en_progreso') {
        updates.push('fecha_inicio = COALESCE(fecha_inicio, CURDATE())');
    } else if (estado === 'completada') {
        updates.push('fecha_fin = CURDATE(), progreso = 100.00');
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    values.push(usuario_id, asignacion_id);

    try {
        const [result] = await pool.promise().query(
            `UPDATE usuarios_rutinas SET ${updates.join(', ')}, updated_at = NOW() 
             WHERE usuario_id = ? AND id = ?`, 
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
        }
        
        res.json({ success: true, message: 'Progreso actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar progreso' });
    }
});

// Estadísticas de rutinas
app.get('/rutinas/estadisticas', async (req, res) => {
    try {
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(DISTINCT r.id) as total_rutinas,
                COUNT(DISTINCT CASE WHEN r.tipo = 'publica' THEN r.id END) as rutinas_publicas,
                COUNT(DISTINCT CASE WHEN r.tipo = 'personalizada' THEN r.id END) as rutinas_personalizadas,
                COUNT(DISTINCT e.id) as total_ejercicios,
                COUNT(DISTINCT ur.id) as total_asignaciones,
                COUNT(DISTINCT CASE WHEN ur.estado = 'en_progreso' THEN ur.id END) as rutinas_en_progreso,
                COUNT(DISTINCT CASE WHEN ur.estado = 'completada' THEN ur.id END) as rutinas_completadas
            FROM rutinas r
            LEFT JOIN ejercicios e ON e.estado = 'activo'
            LEFT JOIN usuarios_rutinas ur ON r.id = ur.rutina_id
            WHERE r.estado = 'activo'
        `);
        
        const [populares] = await pool.promise().query(`
            SELECT id, nombre, objetivo, nivel, popularidad
            FROM rutinas
            WHERE estado = 'activo' AND tipo = 'publica'
            ORDER BY popularidad DESC
            LIMIT 5
        `);
        
        res.json({
            ...stats[0],
            rutinas_populares: populares
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🏋️ Sistema de Gimnasio corriendo en http://localhost:${port}`);
    console.log('\n📋 ENDPOINTS DISPONIBLES:');
    console.log('👤 USUARIOS:');
    console.log('  POST /login - Iniciar sesión');
    console.log('  POST /register - Registrar usuario');
    console.log('  GET /usuarios - Listar usuarios');
    console.log('  GET /usuarios/:id - Ver usuario individual');
    console.log('  PUT /usuarios/:id - Actualizar usuario');
    console.log('  PUT /usuarios/:id/estado - Cambiar estado');
    console.log('  DELETE /usuarios/:id - Eliminar usuario');
    console.log('  POST /usuarios/:id/visita - Registrar visita');
    console.log('  GET /usuarios/estadisticas - Estadísticas usuarios');
    console.log('\n🛒 PRODUCTOS:');
    console.log('  GET /productos - Listar productos');
    console.log('  GET /productos/:id - Ver producto individual');
    console.log('  POST /productos - Crear producto');
    console.log('  PUT /productos/:id - Actualizar producto');
    console.log('  DELETE /productos/:id - Eliminar producto');
    console.log('  POST /productos/:id/vender - Vender producto');
    console.log('  GET /productos/estadisticas - Estadísticas productos');
    console.log('  GET /ventas - Historial de ventas');
    console.log('\n💪 EJERCICIOS:');
    console.log('  GET /ejercicios - Listar ejercicios (filtros: ?grupo_muscular=pecho&tipo=fuerza&nivel=principiante)');
    console.log('  GET /ejercicios/:id - Ver ejercicio individual');
    console.log('  POST /ejercicios - Crear ejercicio');
    console.log('  PUT /ejercicios/:id - Actualizar ejercicio');
    console.log('  DELETE /ejercicios/:id - Eliminar ejercicio');
    console.log('\n📋 RUTINAS:');
    console.log('  GET /rutinas - Listar rutinas (filtros: ?objetivo=hipertrofia&nivel=intermedio&tipo=publica)');
    console.log('  GET /rutinas/:id - Ver rutina completa con ejercicios');
    console.log('  POST /rutinas - Crear rutina (con ejercicios opcionales)');
    console.log('  PUT /rutinas/:id - Actualizar rutina');
    console.log('  DELETE /rutinas/:id - Eliminar rutina');
    console.log('  POST /rutinas/:id/ejercicios - Agregar ejercicio a rutina');
    console.log('  PUT /rutinas/:rutina_id/ejercicios/:ejercicio_id - Actualizar ejercicio en rutina');
    console.log('  DELETE /rutinas/:rutina_id/ejercicios/:ejercicio_id - Eliminar ejercicio de rutina');
    console.log('  POST /usuarios/:usuario_id/rutinas/:rutina_id - Asignar rutina a usuario');
    console.log('  GET /usuarios/:usuario_id/rutinas - Ver rutinas de usuario');
    console.log('  PUT /usuarios/:usuario_id/rutinas/:asignacion_id - Actualizar progreso de rutina');
    console.log('  GET /rutinas/estadisticas - Estadísticas de rutinas');
    console.log('\n🏋️ ENTRENADORES:');
    console.log('  GET /entrenadores - Listar entrenadores (filtros: ?especialidad=fuerza&estado=activo)');
    console.log('  GET /entrenadores/:id - Ver entrenador con horarios');
    console.log('  POST /entrenadores - Crear entrenador');
    console.log('  PUT /entrenadores/:id - Actualizar entrenador');
    console.log('  DELETE /entrenadores/:id - Eliminar entrenador');
    console.log('  GET /entrenadores/:id/horarios - Listar horarios');
    console.log('  POST /entrenadores/:id/horarios - Crear horario');
    console.log('  DELETE /entrenadores/:id/horarios/:horario_id - Eliminar horario');
    console.log('  POST /entrenadores/:entrenador_id/clientes/:usuario_id - Asignar cliente');
    console.log('  GET /entrenadores/:entrenador_id/clientes - Ver clientes del entrenador');
    console.log('  DELETE /entrenadores/:entrenador_id/clientes/:usuario_id - Quitar cliente');
    console.log('  POST /entrenadores/:entrenador_id/sesiones - Crear sesión');
    console.log('  GET /entrenadores/:entrenador_id/sesiones - Listar sesiones');
    console.log('  PUT /sesiones/:id - Actualizar sesión');
    console.log('  POST /entrenadores/:entrenador_id/valoraciones - Crear valoración');
    console.log('  GET /entrenadores/:entrenador_id/valoraciones - Listar valoraciones');
    console.log('  GET /entrenadores/estadisticas - Estadísticas de entrenadores');
});