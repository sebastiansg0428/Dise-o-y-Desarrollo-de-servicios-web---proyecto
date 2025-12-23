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

// Vender producto
app.post('/productos/:id/vender', async (req, res) => {
    const { id } = req.params;
    const { cantidad, usuario_id, metodo_pago = 'efectivo' } = req.body;
    
    if (!cantidad || cantidad <= 0) {
        return res.status(400).json({ success: false, message: 'Cantidad inválida' });
    }
    
    try {
        // Verificar producto y stock
        const [producto] = await pool.promise().query(
            'SELECT nombre, stock, precio_venta FROM productos WHERE id = ? AND estado = "activo"',
            [id]
        );
        
        if (producto.length === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado o inactivo' });
        }
        
        if (producto[0].stock < cantidad) {
            return res.status(400).json({ success: false, message: 'Stock insuficiente' });
        }
        
        const total = producto[0].precio_venta * cantidad;
        
        // Registrar venta
        await pool.promise().query(
            'INSERT INTO ventas (usuario_id, producto_id, cantidad, precio_unitario, total, metodo_pago) VALUES (?, ?, ?, ?, ?, ?)',
            [usuario_id, id, cantidad, producto[0].precio_venta, total, metodo_pago]
        );
        
        // Actualizar stock
        await pool.promise().query(
            'UPDATE productos SET stock = stock - ? WHERE id = ?',
            [cantidad, id]
        );
        
        res.json({ 
            success: true, 
            message: `Venta registrada: ${cantidad} x ${producto[0].nombre}`,
            total: total
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al procesar venta' });
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
    console.log('  GET /productos - Listar productos (filtros: ?categoria=suplementos&stock_bajo=true)');
    console.log('  GET /productos/:id - Ver producto individual');
    console.log('  POST /productos - Crear producto nombre, descripcion, categoria, stock, stock_minimo, precio_compra, precio_venta');
    console.log('  PUT /productos/:id - Actualizar producto');
    console.log('  DELETE /productos/:id - Eliminar producto');
    console.log('  POST /productos/:id/vender - Vender producto');
    console.log('  GET /productos/estadisticas - Estadísticas productos');
    console.log('  GET /ventas - Historial de ventas');
});