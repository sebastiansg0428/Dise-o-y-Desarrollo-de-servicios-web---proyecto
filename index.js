const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3001;

// Middlewares - CORS mejorado para React
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Manejar preflight requests
app.options('*', cors());

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
            'SELECT id, nombre, apellido, email, telefono, genero, membresia, estado, fecha_vencimiento FROM usuarios WHERE email = ? AND password = ? AND estado = "activo"',
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

// Registro de usuario (autoregistro público)
app.post('/register', async (req, res) => {
    const { 
        nombre, apellido, email, password, telefono, 
        fecha_nacimiento, genero, membresia = 'dia',
        direccion, contacto_emergencia, contacto_emergencia_telefono,
        objetivo_fitness, condiciones_medicas, notas
    } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, message: 'Nombre, email y password son requeridos' });
    }

    if (!apellido) {
        return res.status(400).json({ success: false, message: 'El apellido es requerido' });
    }

    if (!telefono) {
        return res.status(400).json({ success: false, message: 'El teléfono es requerido' });
    }

    if (!genero || !['M', 'F', 'Otro'].includes(genero)) {
        return res.status(400).json({ success: false, message: 'Género inválido (opciones: M, F, Otro)' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Formato de email inválido' });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Calcular precio y fecha de vencimiento según membresía
    // Opciones disponibles: diaria, semanal, quincenal, mensual, anual (COINCIDEN CON FRONTEND)
    const precios = { 
        diaria: 4000,
        semanal: 30000,
        quincenal: 40000,
        mensual: 60000,
        anual: 600000 
    };
    const membresiaLower = membresia.toLowerCase().trim(); // Convertir a minúsculas y quitar espacios
    const precio_membresia = precios[membresiaLower] || 4000;
    
    // Obtener fecha actual SIN zona horaria
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = ahora.getMonth() + 1; // 1-12
    const day = ahora.getDate();
    
    // Fecha de inicio es HOY
    const fecha_inicio = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Calcular días a sumar
    let diasASumar = 0;
    switch(membresiaLower) {
        case 'diaria':
            diasASumar = 1; 
            break;
        case 'semanal': 
            diasASumar = 7; 
            break;
        case 'quincenal': 
            diasASumar = 15; 
            break;
        case 'mensual': 
            diasASumar = 30; 
            break;
        case 'anual': 
            diasASumar = 365; 
            break;
        default: 
            diasASumar = 1;
    }
    
    // Crear fecha de vencimiento sumando días
    const inicioDate = new Date(year, month - 1, day);
    inicioDate.setDate(inicioDate.getDate() + diasASumar);
    
    const fecha_vencimiento = `${inicioDate.getFullYear()}-${String(inicioDate.getMonth() + 1).padStart(2, '0')}-${String(inicioDate.getDate()).padStart(2, '0')}`;
    
    console.log('✅ REGISTRO:', { membresia: membresiaLower, inicio: fecha_inicio, vence: fecha_vencimiento, dias: diasASumar });

    try {
        const [result] = await pool.promise().query(
            `INSERT INTO usuarios 
             (nombre, apellido, email, password, telefono, fecha_nacimiento, genero, 
              membresia, precio_membresia, fecha_inicio_membresia, fecha_vencimiento, ultima_visita, estado) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'activo')`,
            [nombre, apellido, email, password, telefono, fecha_nacimiento, genero, 
             membresiaLower, precio_membresia, fecha_inicio, fecha_vencimiento]
        );

        const usuario_id = result.insertId;

        // Crear el pago automáticamente con estado "pagado"
        await pool.promise().query(
            `INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, estado, fecha_pago)
             VALUES (?, 'membresia', ?, ?, 'efectivo', 'pagado', NOW())`,
            [usuario_id, `Membresía ${membresiaLower}`, precio_membresia]
        );

        // Obtener el usuario recién creado (sin password)
        const [newUser] = await pool.promise().query(
            `SELECT id, nombre, apellido, email, telefono, genero, fecha_nacimiento,
                    membresia, estado, precio_membresia,
                    DATE_FORMAT(fecha_inicio_membresia, "%d/%m/%Y") as fecha_inicio_membresia,
                    DATE_FORMAT(fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento,
                    DATEDIFF(fecha_vencimiento, CURDATE()) as dias_restantes
             FROM usuarios WHERE id = ?`,
            [usuario_id]
        );

        res.status(201).json({ 
            success: true, 
            id: usuario_id,
            message: '¡Bienvenido! Usuario registrado exitosamente',
            user: newUser[0]
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El email ya existe' });
        }
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Crear cliente (solo para administradores - sin password obligatorio)
app.post('/admin/clientes', async (req, res) => {
    const { 
        nombre, apellido, email, password, telefono, 
        fecha_nacimiento, genero, membresia = 'dia',
        direccion, contacto_emergencia, contacto_emergencia_telefono,
        objetivo_fitness, condiciones_medicas, notas, estado = 'activo'
    } = req.body;

    // Validaciones básicas
    if (!nombre || !apellido || !email) {
        return res.status(400).json({ 
            success: false, 
            message: 'Nombre, apellido y email son requeridos' 
        });
    }

    if (!telefono) {
        return res.status(400).json({ success: false, message: 'El teléfono es requerido' });
    }

    if (!genero || !['M', 'F', 'Otro'].includes(genero)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Género inválido (opciones: M, F, Otro)' 
        });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Formato de email inválido' });
    }

    // Si no se proporciona password, generar uno temporal
    const finalPassword = password || `Gym${Math.random().toString(36).slice(-8)}`;

    // Calcular precio y fecha de vencimiento
    // Opciones disponibles: diaria, semanal, quincenal, mensual, anual
    const precios = { 
        diaria: 4000,
        semanal: 30000,
        quincenal: 40000,
        mensual: 60000,
        anual: 600000 
    };
    const membresiaLower = membresia.toLowerCase().trim(); // Convertir a minúsculas y quitar espacios
    const precio_membresia = precios[membresiaLower] || 4000;
    
    // Obtener fecha actual SIN zona horaria
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = ahora.getMonth() + 1; // 1-12
    const day = ahora.getDate();
    
    // Fecha de inicio es HOY
    const fecha_inicio = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Calcular días a sumar
    let diasASumar = 0;
    switch(membresiaLower) {
        case 'diaria':
            diasASumar = 1; 
            break;
        case 'semanal': 
            diasASumar = 7; 
            break;
        case 'quincenal': 
            diasASumar = 15; 
            break;
        case 'mensual': 
            diasASumar = 30; 
            break;
        case 'anual': 
            diasASumar = 365; 
            break;
        default: 
            diasASumar = 1;
    }
    
    // Crear fecha de vencimiento sumando días
    const inicioDate = new Date(year, month - 1, day);
    inicioDate.setDate(inicioDate.getDate() + diasASumar);
    
    const fecha_vencimiento = `${inicioDate.getFullYear()}-${String(inicioDate.getMonth() + 1).padStart(2, '0')}-${String(inicioDate.getDate()).padStart(2, '0')}`;
    
    console.log('✅ ADMIN CLIENTE:', { membresia: membresiaLower, inicio: fecha_inicio, vence: fecha_vencimiento, dias: diasASumar });

    try {
        const [result] = await pool.promise().query(
            `INSERT INTO usuarios 
             (nombre, apellido, email, password, telefono, fecha_nacimiento, genero, 
              membresia, precio_membresia, fecha_inicio_membresia, fecha_vencimiento, estado) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, apellido, email, finalPassword, telefono, fecha_nacimiento, genero, 
             membresiaLower, precio_membresia, fecha_inicio, fecha_vencimiento, estado]
        );

        const usuario_id = result.insertId;

        // Crear el pago automáticamente con estado "pagado"
        await pool.promise().query(
            `INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, estado, fecha_pago)
             VALUES (?, 'membresia', ?, ?, 'efectivo', 'pagado', NOW())`,
            [usuario_id, `Membresía ${membresiaLower}`, precio_membresia]
        );

        // Obtener el cliente recién creado
        const [newClient] = await pool.promise().query(
            `SELECT id, nombre, apellido, email, telefono, genero, fecha_nacimiento,
                    membresia, estado, precio_membresia, total_visitas,
                    DATE_FORMAT(fecha_inicio_membresia, "%d/%m/%Y") as fecha_inicio_membresia,
                    DATE_FORMAT(fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento,
                    DATEDIFF(fecha_vencimiento, CURDATE()) as dias_restantes,
                    DATE_FORMAT(created_at, "%d/%m/%Y") as fecha_registro
             FROM usuarios WHERE id = ?`,
            [usuario_id]
        );

        res.status(201).json({ 
            success: true, 
            id: usuario_id,
            message: 'Cliente creado exitosamente',
            cliente: newClient[0],
            password_temporal: !password ? finalPassword : undefined
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El email ya existe' });
        }
        console.error('Error al crear cliente:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Listar usuarios
app.get('/usuarios', async (req, res) => {
    const { estado, membresia, vencidos } = req.query;
    
    let query = `
        SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, u.genero, u.fecha_nacimiento, 
               u.membresia, u.estado, u.precio_membresia, u.total_visitas,
               DATE_FORMAT(u.ultima_visita, "%d/%m/%Y %H:%i") as ultima_visita,
               DATE_FORMAT(u.fecha_inicio_membresia, "%d/%m/%Y") as fecha_inicio_membresia,
               DATE_FORMAT(u.fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento,
               DATE_FORMAT(u.created_at, "%d/%m/%Y") as fecha_registro,
               DATEDIFF(u.fecha_vencimiento, CURDATE()) as dias_restantes,
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

// Estadísticas de usuarios (DEBE IR ANTES de /usuarios/:id)
app.get('/usuarios/estadisticas', async (req, res) => {
    try {
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_usuarios,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as usuarios_activos,
                SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as usuarios_inactivos,
                SUM(CASE WHEN estado = 'suspendido' THEN 1 ELSE 0 END) as usuarios_suspendidos,
                SUM(CASE WHEN membresia = 'diaria' THEN 1 ELSE 0 END) as membresia_diaria,
                SUM(CASE WHEN membresia = 'semanal' THEN 1 ELSE 0 END) as membresia_semanal,
                SUM(CASE WHEN membresia = 'quincenal' THEN 1 ELSE 0 END) as membresia_quincenal,
                SUM(CASE WHEN membresia = 'mensual' THEN 1 ELSE 0 END) as membresia_mensual,
                SUM(CASE WHEN membresia = 'anual' THEN 1 ELSE 0 END) as membresia_anual,
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

// Obtener usuarios con membresías activas (para renovación)
app.get('/usuarios/membresias/activas', async (req, res) => {
    try {
        const [usuarios] = await pool.promise().query(`
            SELECT 
                u.id,
                u.nombre,
                u.apellido,
                u.email,
                u.telefono,
                u.membresia,
                u.precio_membresia,
                DATE_FORMAT(u.fecha_inicio_membresia, "%d/%m/%Y") as fecha_inicio_membresia,
                DATE_FORMAT(u.fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento,
                DATEDIFF(u.fecha_vencimiento, CURDATE()) as dias_restantes,
                CASE 
                    WHEN u.fecha_vencimiento < CURDATE() THEN 'vencida'
                    WHEN DATEDIFF(u.fecha_vencimiento, CURDATE()) <= 7 THEN 'por_vencer'
                    ELSE 'vigente'
                END as estado_membresia
            FROM usuarios u
            WHERE u.estado = 'activo'
            AND u.fecha_vencimiento IS NOT NULL
            AND u.fecha_vencimiento >= CURDATE()
            ORDER BY u.fecha_vencimiento ASC
        `);
        
        res.json({
            success: true,
            count: usuarios.length,
            usuarios: usuarios
        });
    } catch (error) {
        console.error('❌ Error al obtener membresías activas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener membresías activas', 
            error: error.message 
        });
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
    const { nombre, apellido, email, telefono, fecha_nacimiento, genero, membresia, estado, renovar_membresia, precio_renovacion, metodo_pago } = req.body;
    
    const updates = [];
    const values = [];
    
    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (apellido) { updates.push('apellido = ?'); values.push(apellido); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (telefono) { updates.push('telefono = ?'); values.push(telefono); }
    if (fecha_nacimiento) { 
        // Convertir fecha ISO a formato MySQL (YYYY-MM-DD)
        const fecha = new Date(fecha_nacimiento);
        const fechaMySQL = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        updates.push('fecha_nacimiento = ?'); 
        values.push(fechaMySQL); 
    }
    if (genero) { updates.push('genero = ?'); values.push(genero); }
    if (estado) { updates.push('estado = ?'); values.push(estado); }
    
    // Si se está renovando membresía o cambiando membresía
    if (membresia) { 
        const membresiaLower = membresia.toLowerCase().trim();
        const precios = { 
            diaria: 4000,
            semanal: 30000,
            quincenal: 40000,
            mensual: 60000,
            anual: 600000 
        };
        const diasMembresia = {
            diaria: 1,
            semanal: 7,
            quincenal: 15,
            mensual: 30,
            anual: 365
        };
        
        updates.push('membresia = ?'); 
        updates.push('precio_membresia = ?');
        updates.push('fecha_inicio_membresia = CURDATE()');
        updates.push('fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL ? DAY)');
        
        values.push(membresiaLower);
        values.push(precios[membresiaLower] || 4000);
        values.push(diasMembresia[membresiaLower] || 1);
    }
    
    if (updates.length === 0 && !renovar_membresia) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    
    values.push(id);

    try {
        // Actualizar usuario si hay campos
        if (updates.length > 0) {
            const [result] = await pool.promise().query(
                `UPDATE usuarios SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, 
                values
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }
        }
        
        // Si se está renovando membresía, crear un pago
        if (renovar_membresia && membresia && precio_renovacion) {
            const membresiaLower = membresia.toLowerCase().trim();
            await pool.promise().query(
                `INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, estado, fecha_pago)
                 VALUES (?, 'membresia', ?, ?, ?, 'pagado', NOW())`,
                [id, `Renovación Membresía ${membresiaLower}`, precio_renovacion, metodo_pago || 'efectivo']
            );
            console.log(`✅ Pago de renovación creado para usuario ${id}: $${precio_renovacion}`);
        }
        
        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error('❌ Error al actualizar usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Email ya existe' });
        }
        res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: error.message });
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
        // Estadísticas generales de entrenadores
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_entrenadores,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as entrenadores_activos,
                AVG(tarifa_rutina) as tarifa_promedio
            FROM entrenadores
        `);

        // Total de clientes asignados a todos los entrenadores
        const [clientesStats] = await pool.promise().query(`
            SELECT COUNT(DISTINCT usuario_id) as total_clientes_asignados
            FROM entrenadores_clientes
            WHERE estado = 'activo'
        `);

        // Sesiones programadas (futuras)
        const [sesionesStats] = await pool.promise().query(`
            SELECT COUNT(*) as sesiones_programadas
            FROM sesiones_entrenamiento
            WHERE fecha_sesion >= CURDATE() AND estado IN ('pendiente', 'confirmada')
        `);

        // Estadísticas de valoraciones
        const [valoracionesStats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_valoraciones,
                COALESCE(AVG(puntuacion), 0) as promedio_valoraciones
            FROM valoraciones_entrenadores
        `);

        // Top 5 entrenadores mejor valorados
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

        res.json({ 
            ...stats[0],
            total_clientes_asignados: clientesStats[0].total_clientes_asignados,
            sesiones_programadas: sesionesStats[0].sesiones_programadas,
            total_valoraciones: valoracionesStats[0].total_valoraciones,
            promedio_valoraciones: parseFloat(valoracionesStats[0].promedio_valoraciones.toFixed(2)),
            top_entrenadores: ranking 
        });
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
               CAST(e.tarifa_rutina AS UNSIGNED) as tarifa_rutina, e.estado,
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
            `SELECT e.id, e.nombre, e.apellido, e.email, e.telefono, e.genero, e.fecha_nacimiento,
                    e.especialidad_principal, e.experiencia_anios, e.certificaciones, e.biografia,
                    CAST(e.tarifa_rutina AS UNSIGNED) as tarifa_rutina, e.estado, e.created_at, e.updated_at,
                    COALESCE(AVG(v.puntuacion), 0) as promedio_puntuacion,
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
                    CAST(e.tarifa_rutina AS UNSIGNED) as tarifa_rutina, e.estado,
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
app.post('/entrenadores/:entrenador_id/clientes', async (req, res) => {
    const { entrenador_id } = req.params;
    const { usuario_id, notas } = req.body;
    
    if (!usuario_id) {
        return res.status(400).json({ success: false, message: 'usuario_id es requerido' });
    }
    
    try {
        // Verificar si ya está asignado
        const [yaAsignado] = await pool.promise().query(
            'SELECT id FROM entrenadores_clientes WHERE entrenador_id = ? AND usuario_id = ?',
            [entrenador_id, usuario_id]
        );
        
        if (yaAsignado.length > 0) {
            return res.status(409).json({ success: false, message: 'El cliente ya está asignado a este entrenador' });
        }
        
        const [result] = await pool.promise().query(
            `INSERT INTO entrenadores_clientes (entrenador_id, usuario_id, notas, estado)
             VALUES (?, ?, ?, 'activo')`,
            [entrenador_id, usuario_id, notas || null]
        );
        
        res.status(201).json({ 
            success: true, 
            id: result.insertId, 
            message: 'Cliente asignado correctamente'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error al asignar cliente',
            error: error.message
        });
    }
});

app.get('/entrenadores/:entrenador_id/clientes', async (req, res) => {
    const { entrenador_id } = req.params;
    const { estado } = req.query;
    let query = `
        SELECT ec.id as asignacion_id, ec.estado, ec.fecha_asignacion, ec.notas,
               u.id as usuario_id, u.nombre, u.apellido, u.email, u.telefono, u.genero, u.membresia
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
    
    // Validar que usuario_id no sea undefined o inválido
    if (!usuario_id || usuario_id === 'undefined' || usuario_id === 'null') {
        return res.status(400).json({ 
            success: false, 
            message: 'ID de usuario inválido'
        });
    }
    
    try {
        const [result] = await pool.promise().query(
            'DELETE FROM entrenadores_clientes WHERE entrenador_id = ? AND usuario_id = ?',
            [entrenador_id, usuario_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado en este entrenador'
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Cliente eliminado correctamente'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar cliente',
            error: error.message
        });
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

// Eliminar sesión
app.delete('/sesiones/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!id || id === 'undefined') {
        return res.status(400).json({ success: false, message: 'ID de sesión inválido' });
    }
    
    try {
        const [result] = await pool.promise().query(
            'DELETE FROM sesiones_entrenamiento WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
        }
        
        res.json({ success: true, message: 'Sesión eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar sesión',
            error: error.message
        });
    }
});

// Ver sesión individual
app.get('/sesiones/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query(
            `SELECT s.*, 
                    e.nombre as entrenador_nombre, e.apellido as entrenador_apellido,
                    u.nombre as usuario_nombre, u.apellido as usuario_apellido,
                    r.nombre as rutina_nombre,
                    DATE_FORMAT(s.fecha, "%d/%m/%Y %H:%i") as fecha_programada
             FROM sesiones_entrenamiento s
             LEFT JOIN entrenadores e ON s.entrenador_id = e.id
             LEFT JOIN usuarios u ON s.usuario_id = u.id
             LEFT JOIN rutinas r ON s.rutina_id = r.id
             WHERE s.id = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Valoraciones de entrenadores
app.post('/entrenadores/:entrenador_id/valoraciones', async (req, res) => {
    const { entrenador_id } = req.params;
    const { usuario_id, puntuacion, comentario } = req.body;
    
    if (!usuario_id || !puntuacion) {
        return res.status(400).json({ success: false, message: 'usuario_id y puntuacion son requeridos' });
    }
    
    // Validar puntuación entre 1 y 5
    if (puntuacion < 1 || puntuacion > 5) {
        return res.status(400).json({ success: false, message: 'La puntuación debe estar entre 1 y 5' });
    }
    
    try {
        // Verificar si el usuario ya valoró a este entrenador
        const [existente] = await pool.promise().query(
            'SELECT id FROM valoraciones_entrenadores WHERE entrenador_id = ? AND usuario_id = ?',
            [entrenador_id, usuario_id]
        );
        
        if (existente.length > 0) {
            // Actualizar valoración existente
            await pool.promise().query(
                'UPDATE valoraciones_entrenadores SET puntuacion = ?, comentario = ?, created_at = NOW() WHERE entrenador_id = ? AND usuario_id = ?',
                [puntuacion, comentario, entrenador_id, usuario_id]
            );
            return res.json({ success: true, message: 'Valoración actualizada' });
        }
        
        // Crear nueva valoración
        const [result] = await pool.promise().query(
            `INSERT INTO valoraciones_entrenadores (entrenador_id, usuario_id, puntuacion, comentario)
             VALUES (?, ?, ?, ?)`,
            [entrenador_id, usuario_id, puntuacion, comentario]
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Valoración registrada' });
    } catch (error) {
        console.error('Error al registrar valoración:', error);
        res.status(500).json({ success: false, message: 'Error al registrar valoración', error: error.message });
    }
});

app.get('/entrenadores/:entrenador_id/valoraciones', async (req, res) => {
    const { entrenador_id } = req.params;
    try {
        const [rows] = await pool.promise().query(
            `SELECT v.id, v.entrenador_id, v.usuario_id, v.puntuacion, v.comentario,
                    DATE_FORMAT(v.created_at, "%d/%m/%Y %H:%i") as fecha_valoracion,
                    u.nombre as usuario_nombre, u.apellido as usuario_apellido
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

// Eliminar valoración
app.delete('/entrenadores/:entrenador_id/valoraciones/:valoracion_id', async (req, res) => {
    const { entrenador_id, valoracion_id } = req.params;
    
    if (!valoracion_id || valoracion_id === 'undefined') {
        return res.status(400).json({ success: false, message: 'ID de valoración inválido' });
    }
    
    try {
        const [result] = await pool.promise().query(
            'DELETE FROM valoraciones_entrenadores WHERE id = ? AND entrenador_id = ?',
            [valoracion_id, entrenador_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Valoración no encontrada' });
        }
        
        res.json({ success: true, message: 'Valoración eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar valoración',
            error: error.message
        });
    }
});

// ==================== PAGOS Y FACTURAS ====================

// Estadísticas de pagos
app.get('/pagos/estadisticas', async (req, res) => {
    try {
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_pagos,
                SUM(CASE WHEN estado = 'pagado' THEN 1 ELSE 0 END) as pagos_completados,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pagos_pendientes,
                SUM(CASE WHEN estado = 'pagado' THEN monto ELSE 0 END) as ingresos_totales,
                SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END) as por_cobrar,
                COUNT(CASE WHEN DATE(fecha_pago) = CURDATE() THEN 1 END) as pagos_hoy,
                SUM(CASE WHEN DATE(fecha_pago) = CURDATE() AND estado = 'pagado' THEN monto ELSE 0 END) as ingresos_hoy
            FROM pagos
        `);
        
        const [porMetodo] = await pool.promise().query(`
            SELECT metodo_pago, COUNT(*) as cantidad, SUM(monto) as total
            FROM pagos
            WHERE estado = 'pagado'
            GROUP BY metodo_pago
        `);
        
        const [porTipo] = await pool.promise().query(`
            SELECT tipo_pago, COUNT(*) as cantidad, SUM(monto) as total
            FROM pagos
            WHERE estado = 'pagado'
            GROUP BY tipo_pago
        `);
        
        res.json({
            ...stats[0],
            por_metodo: porMetodo,
            por_tipo: porTipo
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Estadísticas de membresías
app.get('/pagos/estadisticas/membresias', async (req, res) => {
    try {
        // Total de membresías vendidas (total de usuarios con membresía)
        const [totalMembresias] = await pool.promise().query(`
            SELECT COUNT(*) as total
            FROM usuarios
            WHERE membresia IS NOT NULL AND estado != 'suspendido'
        `);
        
        // Membresías activas (con fecha de vencimiento vigente)
        const [membresiasActivas] = await pool.promise().query(`
            SELECT COUNT(*) as activas
            FROM usuarios
            WHERE estado = 'activo' 
            AND fecha_vencimiento >= CURDATE()
        `);
        
        // Membresías por vencer en los próximos 7 días
        const [membresiasPorVencer] = await pool.promise().query(`
            SELECT COUNT(*) as por_vencer
            FROM usuarios
            WHERE estado = 'activo'
            AND fecha_vencimiento >= CURDATE()
            AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        `);
        
        // Membresías vencidas
        const [membresiasVencidas] = await pool.promise().query(`
            SELECT COUNT(*) as vencidas
            FROM usuarios
            WHERE fecha_vencimiento < CURDATE()
            AND estado = 'activo'
        `);
        
        // Distribución por tipo de membresía
        const [porTipoMembresia] = await pool.promise().query(`
            SELECT 
                membresia,
                COUNT(*) as cantidad,
                SUM(precio_membresia) as ingresos_totales
            FROM usuarios
            WHERE estado = 'activo'
            GROUP BY membresia
            ORDER BY cantidad DESC
        `);
        
        // Ingresos del mes actual por membresías
        const [ingresosMes] = await pool.promise().query(`
            SELECT 
                SUM(monto) as ingresos_mes
            FROM pagos
            WHERE tipo_pago = 'membresia'
            AND estado = 'pagado'
            AND MONTH(fecha_pago) = MONTH(CURDATE())
            AND YEAR(fecha_pago) = YEAR(CURDATE())
        `);
        
        res.json({
            total: totalMembresias[0].total,
            activas: membresiasActivas[0].activas,
            porVencer: membresiasPorVencer[0].por_vencer,
            vencidas: membresiasVencidas[0].vencidas,
            porTipo: porTipoMembresia,
            ingresosMesActual: ingresosMes[0].ingresos_mes || 0
        });
    } catch (error) {
        console.error('Error en estadísticas de membresías:', error);
        res.status(500).json({ error: error.message });
    }
});

// Listar pagos
app.get('/pagos', async (req, res) => {
    const { usuario_id, tipo_pago, estado, metodo_pago, fecha_desde, fecha_hasta } = req.query;
    
    let query = `
        SELECT p.id, p.usuario_id, p.tipo_pago, p.concepto, p.monto, p.metodo_pago, 
               p.estado, p.comprobante,
               DATE_FORMAT(p.fecha_pago, "%d/%m/%Y %H:%i") as fecha_pago,
               DATE_FORMAT(p.created_at, "%d/%m/%Y %H:%i") as fecha_registro,
               u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email
        FROM pagos p
        INNER JOIN usuarios u ON p.usuario_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (usuario_id) {
        query += ' AND p.usuario_id = ?';
        params.push(usuario_id);
    }
    
    if (tipo_pago) {
        query += ' AND p.tipo_pago = ?';
        params.push(tipo_pago);
    }
    
    if (estado) {
        query += ' AND p.estado = ?';
        params.push(estado);
    }
    
    if (metodo_pago) {
        query += ' AND p.metodo_pago = ?';
        params.push(metodo_pago);
    }
    
    if (fecha_desde) {
        query += ' AND DATE(p.fecha_pago) >= ?';
        params.push(fecha_desde);
    }
    
    if (fecha_hasta) {
        query += ' AND DATE(p.fecha_pago) <= ?';
        params.push(fecha_hasta);
    }
    
    query += ' ORDER BY p.created_at DESC LIMIT 100';
    
    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ver pago individual
app.get('/pagos/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rows] = await pool.promise().query(
            `SELECT p.*, 
                    u.nombre as usuario_nombre, u.apellido as usuario_apellido, 
                    u.email as usuario_email, u.telefono as usuario_telefono,
                    DATE_FORMAT(p.fecha_pago, "%d/%m/%Y %H:%i") as fecha_pago_formatted,
                    DATE_FORMAT(p.created_at, "%d/%m/%Y %H:%i") as fecha_registro_formatted
             FROM pagos p
             INNER JOIN usuarios u ON p.usuario_id = u.id
             WHERE p.id = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pago no encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear pago
app.post('/pagos', async (req, res) => {
    const { usuario_id, tipo_pago, concepto, monto, metodo_pago, comprobante, notas, estado, tipo_membresia } = req.body;
    
    if (!usuario_id || !monto || !concepto) {
        return res.status(400).json({ success: false, message: 'usuario_id, monto y concepto son requeridos' });
    }
    
    if (monto <= 0) {
        return res.status(400).json({ success: false, message: 'El monto debe ser mayor a cero' });
    }
    
    try {
        // Si no se especifica estado o está vacío, por defecto es PAGADO
        // Solo será PENDIENTE si explícitamente se envía estado="pendiente"
        const estadoFinal = (estado && estado.toString().trim().toLowerCase() === 'pendiente') ? 'pendiente' : 'pagado';
        
        console.log('📝 Creando pago:', { 
            estado_recibido: estado, 
            estado_final: estadoFinal,
            tipo_estado: typeof estado,
            tipo_pago: tipo_pago,
            tipo_membresia: tipo_membresia
        });
        
        // SIEMPRE guardar fecha_pago (fecha de registro del pago)
        const [result] = await pool.promise().query(
            `INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, comprobante, notas, estado, fecha_pago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [usuario_id, tipo_pago || 'membresia', concepto, monto, metodo_pago || 'efectivo', comprobante || null, notas || null, estadoFinal]
        );
        
        // Si es un pago de membresía Y está pagado, actualizar el usuario
        if ((tipo_pago === 'membresia' || concepto.toLowerCase().includes('membresía') || concepto.toLowerCase().includes('membresia')) && estadoFinal === 'pagado' && tipo_membresia) {
            const membresiaLower = tipo_membresia.toLowerCase().trim();
            const diasMembresia = {
                diaria: 1,
                semanal: 7,
                quincenal: 15,
                mensual: 30,
                anual: 365
            };
            const precios = {
                diaria: 4000,
                semanal: 30000,
                quincenal: 40000,
                mensual: 60000,
                anual: 600000
            };
            
            if (diasMembresia[membresiaLower]) {
                await pool.promise().query(
                    `UPDATE usuarios 
                     SET membresia = ?,
                         precio_membresia = ?,
                         fecha_inicio_membresia = CURDATE(),
                         fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL ? DAY),
                         estado = 'activo',
                         updated_at = NOW()
                     WHERE id = ?`,
                    [membresiaLower, precios[membresiaLower], diasMembresia[membresiaLower], usuario_id]
                );
                console.log(`✅ Membresía actualizada: ${membresiaLower} (${diasMembresia[membresiaLower]} días)`);
            }
        }
        
        // Obtener el pago recién creado para devolverlo completo
        const [pagoCreado] = await pool.promise().query(
            'SELECT *, DATE_FORMAT(fecha_pago, "%Y-%m-%d %H:%i:%s") as fecha_pago_formatted FROM pagos WHERE id = ?',
            [result.insertId]
        );
        
        console.log('✅ Pago creado:', {
            id: result.insertId,
            estado: estadoFinal,
            fecha_pago: pagoCreado[0].fecha_pago,
            monto: monto,
            tipo: estadoFinal === 'pagado' ? 'Pago inmediato' : 'Pago a cuotas/pendiente'
        });
        
        res.status(201).json({
            success: true,
            id: result.insertId,
            message: estadoFinal === 'pagado' ? 'Pago registrado exitosamente' : 'Pago pendiente registrado (a cuotas)',
            estado: estadoFinal,
            pago: pagoCreado[0]
        });
    } catch (error) {
        console.error('❌ Error al crear pago:', error);
        res.status(500).json({ success: false, message: 'Error al registrar pago', error: error.message });
    }
});

// Marcar pago como pagado
app.put('/pagos/:id/pagar', async (req, res) => {
    const { id } = req.params;
    const { metodo_pago, comprobante, fecha_pago, tipo_membresia } = req.body;
    
    try {
        // Primero obtener el pago para saber si es de membresía
        const [pago] = await pool.promise().query(
            'SELECT * FROM pagos WHERE id = ?',
            [id]
        );
        
        if (pago.length === 0) {
            return res.status(404).json({ success: false, message: 'Pago no encontrado' });
        }
        
        const updates = ['estado = ?'];
        const values = ['pagado'];
        
        if (metodo_pago) {
            updates.push('metodo_pago = ?');
            values.push(metodo_pago);
        }
        
        if (comprobante) {
            updates.push('comprobante = ?');
            values.push(comprobante);
        }
        
        if (fecha_pago) {
            updates.push('fecha_pago = ?');
            values.push(fecha_pago);
        } else {
            updates.push('fecha_pago = NOW()');
        }
        
        values.push(id);
        
        const [result] = await pool.promise().query(
            `UPDATE pagos SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pago no encontrado' });
        }
        
        // Si es pago de membresía, actualizar fecha de vencimiento del usuario
        const pagoData = pago[0];
        if ((pagoData.tipo_pago === 'membresia' || pagoData.concepto.toLowerCase().includes('membresía') || pagoData.concepto.toLowerCase().includes('membresia')) && tipo_membresia) {
            const membresiaLower = tipo_membresia.toLowerCase().trim();
            const diasMembresia = {
                diaria: 1,
                semanal: 7,
                quincenal: 15,
                mensual: 30,
                anual: 365
            };
            const precios = {
                diaria: 4000,
                semanal: 30000,
                quincenal: 40000,
                mensual: 60000,
                anual: 600000
            };
            
            if (diasMembresia[membresiaLower]) {
                await pool.promise().query(
                    `UPDATE usuarios 
                     SET membresia = ?,
                         precio_membresia = ?,
                         fecha_inicio_membresia = CURDATE(),
                         fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL ? DAY),
                         estado = 'activo',
                         updated_at = NOW()
                     WHERE id = ?`,
                    [membresiaLower, precios[membresiaLower], diasMembresia[membresiaLower], pagoData.usuario_id]
                );
                console.log(`✅ Membresía actualizada al marcar pago como pagado: ${membresiaLower}`);
            }
        }
        
        res.json({ success: true, message: 'Pago marcado como pagado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar pago', error: error.message });
    }
});

// Cancelar pago
app.put('/pagos/:id/cancelar', async (req, res) => {
    const { id } = req.params;
    const { notas } = req.body;
    
    try {
        const [result] = await pool.promise().query(
            'UPDATE pagos SET estado = ?, notas = ? WHERE id = ? AND estado = "pendiente"',
            ['cancelado', notas, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pago no encontrado o ya no está pendiente' });
        }
        
        res.json({ success: true, message: 'Pago cancelado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al cancelar pago', error: error.message });
    }
});

// Eliminar pago
app.delete('/pagos/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [result] = await pool.promise().query('DELETE FROM pagos WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pago no encontrado' });
        }
        
        res.json({ success: true, message: 'Pago eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar pago', error: error.message });
    }
});

// Renovar membresía con pago (usa procedimiento almacenado)
app.post('/pagos/renovar-membresia', async (req, res) => {
    const { usuario_id, tipo_membresia, metodo_pago, comprobante } = req.body;
    
    if (!usuario_id || !tipo_membresia) {
        return res.status(400).json({ success: false, message: 'usuario_id y tipo_membresia son requeridos' });
    }
    
    // Normalizar el tipo de membresía
    const membresiaLower = tipo_membresia.toLowerCase().trim();
    const tiposValidos = ['diaria', 'semanal', 'quincenal', 'mensual', 'anual'];
    
    if (!tiposValidos.includes(membresiaLower)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tipo de membresía inválido. Opciones: diaria, semanal, quincenal, mensual, anual' 
        });
    }
    
    try {
        const [result] = await pool.promise().query(
            'CALL sp_renovar_membresia_con_pago(?, ?, ?, ?, @pago_id, @factura_numero)',
            [usuario_id, membresiaLower, metodo_pago || 'efectivo', comprobante]
        );
        
        const [output] = await pool.promise().query('SELECT @pago_id as pago_id, @factura_numero as factura_numero');
        
        res.json({
            success: true,
            message: 'Membresía renovada exitosamente',
            pago_id: output[0].pago_id,
            factura_numero: output[0].factura_numero
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al renovar membresía', error: error.message });
    }
});

// ==================== FACTURAS ====================

// Listar facturas
app.get('/facturas', async (req, res) => {
    const { usuario_id, estado, fecha_desde, fecha_hasta } = req.query;
    
    let query = `
        SELECT f.id, f.numero_factura, f.usuario_id, f.subtotal, f.impuesto, f.descuento, f.total, f.estado,
               DATE_FORMAT(f.fecha_emision, "%d/%m/%Y") as fecha_emision,
               DATE_FORMAT(f.fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento,
               u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email,
               p.metodo_pago, p.fecha_pago
        FROM facturas f
        INNER JOIN usuarios u ON f.usuario_id = u.id
        LEFT JOIN pagos p ON f.pago_id = p.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (usuario_id) {
        query += ' AND f.usuario_id = ?';
        params.push(usuario_id);
    }
    
    if (estado) {
        query += ' AND f.estado = ?';
        params.push(estado);
    }
    
    if (fecha_desde) {
        query += ' AND DATE(f.fecha_emision) >= ?';
        params.push(fecha_desde);
    }
    
    if (fecha_hasta) {
        query += ' AND DATE(f.fecha_emision) <= ?';
        params.push(fecha_hasta);
    }
    
    query += ' ORDER BY f.fecha_emision DESC LIMIT 100';
    
    try {
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ver factura completa con detalles
app.get('/facturas/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [factura] = await pool.promise().query(
            `SELECT f.*, 
                    u.nombre as usuario_nombre, u.apellido as usuario_apellido,
                    u.email as usuario_email, u.telefono as usuario_telefono,
                    u.direccion,
                    DATE_FORMAT(f.fecha_emision, "%d/%m/%Y") as fecha_emision_formatted,
                    DATE_FORMAT(f.fecha_vencimiento, "%d/%m/%Y") as fecha_vencimiento_formatted,
                    p.metodo_pago, p.fecha_pago, p.comprobante
             FROM facturas f
             INNER JOIN usuarios u ON f.usuario_id = u.id
             LEFT JOIN pagos p ON f.pago_id = p.id
             WHERE f.id = ?`,
            [id]
        );
        
        if (factura.length === 0) {
            return res.status(404).json({ success: false, message: 'Factura no encontrada' });
        }
        
        const [detalles] = await pool.promise().query(
            'SELECT * FROM facturas_detalles WHERE factura_id = ?',
            [id]
        );
        
        res.json({
            ...factura[0],
            detalles
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear factura
app.post('/facturas', async (req, res) => {
    const { usuario_id, pago_id, items, impuesto_porcentaje, descuento, notas, fecha_vencimiento } = req.body;
    
    if (!usuario_id || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'usuario_id e items son requeridos' });
    }
    
    const connection = await pool.promise().getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Calcular subtotal
        const subtotal = items.reduce((sum, item) => {
            return sum + (item.cantidad * item.precio_unitario);
        }, 0);
        
        // Calcular impuesto (por defecto 19%)
        const porcentaje_impuesto = impuesto_porcentaje || 0.19;
        const impuesto = subtotal * porcentaje_impuesto;
        
        // Calcular total
        const total = subtotal + impuesto - (descuento || 0);
        
        // Generar número de factura
        const [lastFactura] = await connection.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura, 10) AS UNSIGNED)), 0) as ultimo
             FROM facturas 
             WHERE YEAR(fecha_emision) = YEAR(NOW())`
        );
        
        const siguiente_numero = (lastFactura[0].ultimo || 0) + 1;
        const numero_factura = `FAC-${new Date().getFullYear()}-${String(siguiente_numero).padStart(4, '0')}`;
        
        // Crear factura
        const [facturaResult] = await connection.query(
            `INSERT INTO facturas (numero_factura, pago_id, usuario_id, subtotal, impuesto, descuento, total, fecha_vencimiento, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [numero_factura, pago_id || null, usuario_id, subtotal, impuesto, descuento || 0, total, fecha_vencimiento, notas]
        );
        
        const factura_id = facturaResult.insertId;
        
        // Insertar detalles
        for (const item of items) {
            const subtotal_item = item.cantidad * item.precio_unitario;
            await connection.query(
                `INSERT INTO facturas_detalles (factura_id, descripcion, cantidad, precio_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [factura_id, item.descripcion, item.cantidad, item.precio_unitario, subtotal_item]
            );
        }
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            id: factura_id,
            numero_factura,
            total,
            message: 'Factura creada exitosamente'
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Error al crear factura', error: error.message });
    } finally {
        connection.release();
    }
});

// Anular factura
app.put('/facturas/:id/anular', async (req, res) => {
    const { id } = req.params;
    const { notas } = req.body;
    
    try {
        const [result] = await pool.promise().query(
            'UPDATE facturas SET estado = ?, notas = ? WHERE id = ? AND estado != "anulada"',
            ['anulada', notas, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Factura no encontrada o ya anulada' });
        }
        
        res.json({ success: true, message: 'Factura anulada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al anular factura', error: error.message });
    }
});

// Eliminar factura
app.delete('/facturas/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const [result] = await pool.promise().query('DELETE FROM facturas WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Factura no encontrada' });
        }
        
        res.json({ success: true, message: 'Factura eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar factura', error: error.message });
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

// Estadísticas de rutinas (DEBE IR ANTES de /rutinas/:id)
app.get('/rutinas/estadisticas', async (req, res) => {
    try {
        // Estadísticas generales de rutinas
        const [stats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_rutinas,
                COUNT(CASE WHEN estado = 'activo' THEN 1 END) as rutinas_activas,
                COUNT(CASE WHEN tipo = 'publica' THEN 1 END) as rutinas_publicas,
                COUNT(CASE WHEN tipo = 'privada' THEN 1 END) as rutinas_privadas,
                AVG(duracion_estimada) as duracion_promedio,
                AVG(frecuencia_semanal) as frecuencia_promedio,
                SUM(popularidad) as total_popularidad
            FROM rutinas
            WHERE estado = 'activo'
        `);
        
        // Rutinas por objetivo
        const [porObjetivo] = await pool.promise().query(`
            SELECT 
                objetivo,
                COUNT(*) as cantidad,
                AVG(duracion_estimada) as duracion_promedio
            FROM rutinas
            WHERE estado = 'activo'
            GROUP BY objetivo
            ORDER BY cantidad DESC
        `);
        
        // Rutinas por nivel
        const [porNivel] = await pool.promise().query(`
            SELECT 
                nivel,
                COUNT(*) as cantidad,
                AVG(popularidad) as popularidad_promedio
            FROM rutinas
            WHERE estado = 'activo'
            GROUP BY nivel
            ORDER BY FIELD(nivel, 'principiante', 'intermedio', 'avanzado')
        `);
        
        // Rutinas más populares (top 5)
        const [masPopulares] = await pool.promise().query(`
            SELECT 
                r.id, r.nombre, r.objetivo, r.nivel, r.popularidad,
                r.duracion_estimada, r.frecuencia_semanal,
                COUNT(DISTINCT re.ejercicio_id) as total_ejercicios,
                u.nombre as creador_nombre
            FROM rutinas r
            LEFT JOIN rutinas_ejercicios re ON r.id = re.rutina_id
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.estado = 'activo'
            GROUP BY r.id
            ORDER BY r.popularidad DESC
            LIMIT 5
        `);
        
        // Ejercicios más usados en rutinas
        const [ejerciciosMasUsados] = await pool.promise().query(`
            SELECT 
                e.id, e.nombre, e.grupo_muscular, e.tipo,
                COUNT(DISTINCT re.rutina_id) as veces_usado
            FROM rutinas_ejercicios re
            INNER JOIN ejercicios e ON re.ejercicio_id = e.id
            INNER JOIN rutinas r ON re.rutina_id = r.id
            WHERE r.estado = 'activo'
            GROUP BY e.id
            ORDER BY veces_usado DESC
            LIMIT 10
        `);
        
        // Total de ejercicios únicos en rutinas
        const [totalEjercicios] = await pool.promise().query(`
            SELECT COUNT(DISTINCT re.ejercicio_id) as total
            FROM rutinas_ejercicios re
            INNER JOIN rutinas r ON re.rutina_id = r.id
            WHERE r.estado = 'activo'
        `);
        
        // Rutinas creadas por mes (últimos 6 meses)
        const [porMes] = await pool.promise().query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as mes,
                DATE_FORMAT(created_at, '%M %Y') as mes_nombre,
                COUNT(*) as cantidad
            FROM rutinas
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY mes, mes_nombre
            ORDER BY mes DESC
        `);
        
        res.json({
            ...stats[0],
            por_objetivo: porObjetivo,
            por_nivel: porNivel,
            mas_populares: masPopulares,
            ejercicios_mas_usados: ejerciciosMasUsados,
            total_ejercicios_unicos: totalEjercicios[0].total,
            por_mes: porMes
        });
    } catch (error) {
        console.error('Error en estadísticas de rutinas:', error);
        res.status(500).json({ error: error.message });
    }
});

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

// ==================== ENDPOINT DE PRUEBA FECHAS ====================
app.get('/test/fechas', (req, res) => {
    const { membresia = 'dia' } = req.query;
    
    // Fecha de inicio es HOY
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Calcular fecha de vencimiento
    const fechaVenc = new Date(hoy);
    switch(membresia) {
        case 'dia': 
            fechaVenc.setDate(fechaVenc.getDate() + 1);
            break;
        case 'semanal': 
            fechaVenc.setDate(fechaVenc.getDate() + 7);
            break;
        case 'quincenal': 
            fechaVenc.setDate(fechaVenc.getDate() + 15);
            break;
        case 'mensual': 
            fechaVenc.setDate(fechaVenc.getDate() + 30);
            break;
        case 'anual': 
            fechaVenc.setDate(fechaVenc.getDate() + 365);
            break;
    }
    
    const fecha_inicio = hoy.toISOString().split('T')[0];
    const fecha_vencimiento = fechaVenc.toISOString().split('T')[0];
    
    res.json({
        membresia,
        fecha_inicio_raw: hoy.toISOString(),
        fecha_inicio,
        fecha_vencimiento_raw: fechaVenc.toISOString(),
        fecha_vencimiento,
        dias_diferencia: Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24)),
        timestamp: new Date().toISOString()
    });
});

// ==================== DASHBOARD ====================

// Endpoint especial para el dashboard - devuelve TODOS los datos necesarios en una llamada
app.get('/dashboard', async (req, res) => {
    try {
        // 1. Estadísticas de usuarios (Total Clientes y Asistencia Hoy)
        const [usuariosStats] = await pool.promise().query(`
            SELECT 
                COUNT(*) as total_clientes,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as clientes_activos,
                COUNT(CASE WHEN DATE(ultima_visita) = CURDATE() THEN 1 END) as asistencia_hoy,
                ROUND(AVG(CASE WHEN DATE(ultima_visita) = CURDATE() THEN 1 ELSE 0 END) * 100, 1) as porcentaje_asistencia
            FROM usuarios
        `);

        // 2. Ingresos del mes actual
        const [ingresosStats] = await pool.promise().query(`
            SELECT 
                COALESCE(SUM(CASE WHEN estado = 'pagado' AND MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE()) THEN monto ELSE 0 END), 0) as ingresos_mes_actual,
                COALESCE(SUM(CASE WHEN estado = 'pagado' AND MONTH(fecha_pago) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_pago) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) THEN monto ELSE 0 END), 0) as ingresos_mes_anterior
            FROM pagos
        `);

        // Calcular porcentaje de cambio en ingresos
        const ingresosMesActual = parseFloat(ingresosStats[0].ingresos_mes_actual) || 0;
        const ingresosMesAnterior = parseFloat(ingresosStats[0].ingresos_mes_anterior) || 0;
        let porcentajeCambioIngresos = 0;
        
        if (ingresosMesAnterior > 0) {
            porcentajeCambioIngresos = Math.round(((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100);
        } else if (ingresosMesActual > 0) {
            porcentajeCambioIngresos = 100;
        }

        // 3. Rutinas activas (usuarios con rutinas asignadas y en progreso)
        const [rutinasStats] = await pool.promise().query(`
            SELECT 
                COUNT(DISTINCT usuario_id) as rutinas_activas,
                COUNT(*) as total_asignaciones
            FROM usuarios_rutinas
            WHERE estado IN ('asignada', 'en_progreso')
        `);

        // Calcular estadísticas de rutinas esta semana
        const [rutinasSemanales] = await pool.promise().query(`
            SELECT COUNT(*) as rutinas_semana
            FROM usuarios_rutinas
            WHERE DATE(fecha_asignacion) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `);

        // 4. Actividad reciente (últimas acciones) - Simplificada
        const [actividadReciente] = await pool.promise().query(`
            (SELECT 
                'completado_rutina' as tipo,
                CONCAT(u.nombre, ' ', u.apellido, ' completó su rutina') as descripcion,
                ur.updated_at as fecha,
                u.id as usuario_id
            FROM usuarios_rutinas ur
            INNER JOIN usuarios u ON ur.usuario_id = u.id
            WHERE ur.progreso = 100 AND ur.updated_at IS NOT NULL
            ORDER BY ur.updated_at DESC
            LIMIT 3)
            
            UNION ALL
            
            (SELECT 
                'nueva_inscripcion' as tipo,
                CONCAT('Nueva inscripción: ', nombre, ' ', apellido) as descripcion,
                created_at as fecha,
                id as usuario_id
            FROM usuarios
            WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ORDER BY created_at DESC
            LIMIT 3)
            
            UNION ALL
            
            (SELECT 
                'pago_recibido' as tipo,
                CONCAT('Pago recibido de ', u.nombre, ' ', u.apellido) as descripcion,
                p.fecha_pago as fecha,
                p.usuario_id
            FROM pagos p
            INNER JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.estado = 'pagado' AND DATE(p.fecha_pago) >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
            ORDER BY p.fecha_pago DESC
            LIMIT 3)
            
            ORDER BY fecha DESC
            LIMIT 10
        `);

        // Formatear la actividad reciente
        const actividadFormateada = actividadReciente.map(act => {
            const ahora = new Date();
            const fechaAct = new Date(act.fecha);
            const diffMs = ahora - fechaAct;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHoras = Math.floor(diffMs / 3600000);
            const diffDias = Math.floor(diffMs / 86400000);
            
            let tiempoTranscurrido;
            if (diffMins < 60) {
                tiempoTranscurrido = `Hace ${diffMins} min`;
            } else if (diffHoras < 24) {
                tiempoTranscurrido = `Hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
            } else {
                tiempoTranscurrido = `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
            }
            
            return {
                tipo: act.tipo,
                descripcion: act.descripcion,
                tiempo: tiempoTranscurrido,
                fecha: act.fecha
            };
        });

        // Respuesta consolidada del dashboard con múltiples formatos para compatibilidad
        const totalClientes = parseInt(usuariosStats[0]?.total_clientes) || 0;
        const clientesActivos = parseInt(usuariosStats[0]?.clientes_activos) || 0;
        const asistenciaHoy = parseInt(usuariosStats[0]?.asistencia_hoy) || 0;
        const rutinasActivas = parseInt(rutinasStats[0]?.rutinas_activas) || 0;
        
        res.json({
            // Formato completo
            usuarios: {
                total: totalClientes,  // Alias para compatibilidad
                total_clientes: totalClientes,
                clientes_activos: clientesActivos,
                activos: clientesActivos,  // Alias
                asistencia_hoy: asistenciaHoy,
                asistencia: asistenciaHoy,  // Alias
                porcentaje_asistencia: parseFloat(usuariosStats[0]?.porcentaje_asistencia) || 0
            },
            ingresos: {
                total: ingresosMesActual,  // Alias
                mes_actual: ingresosMesActual,
                mes_anterior: ingresosMesAnterior,
                cambio_porcentaje: porcentajeCambioIngresos,
                cambio: porcentajeCambioIngresos,  // Alias
                texto_cambio: porcentajeCambioIngresos >= 0 
                    ? `+${porcentajeCambioIngresos}% frente a mes anterior` 
                    : `${porcentajeCambioIngresos}% frente a mes anterior`
            },
            rutinas: {
                total: rutinasActivas,  // Alias
                activas: rutinasActivas,
                total_asignaciones: parseInt(rutinasStats[0]?.total_asignaciones) || 0,
                nuevas_esta_semana: parseInt(rutinasSemanales[0]?.rutinas_semana) || 0
            },
            actividad_reciente: actividadFormateada || [],
            // Formato simplificado para acceso rápido
            stats: {
                totalClientes: totalClientes,
                clientesActivos: clientesActivos,
                asistenciaHoy: asistenciaHoy,
                ingresosMes: ingresosMesActual,
                rutinasActivas: rutinasActivas
            }
        });
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({ 
            error: error.message,
            detalles: 'Error al obtener datos del dashboard'
        });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🏋️ Sistema de Gimnasio corriendo en http://localhost:${port}`);
    console.log('\n📋 ENDPOINTS DISPONIBLES:');
    console.log('🏠 DASHBOARD:');
    console.log('  GET /dashboard - Datos completos del dashboard (clientes, ingresos, rutinas, actividad reciente)');
    console.log('\n👤 USUARIOS:');
    console.log('  POST /login - Iniciar sesión');
    console.log('  POST /register - Autoregistro de usuario (público)');
    console.log('  POST /admin/clientes - Crear cliente (administrador) con filtros: ?nombre, apellido, email, telefono, genero, fecha_nacimiento, especialidad_principal, experiencia_anios, certificaciones, biografia, tarifa_rutina');
    console.log('  GET /usuarios - Listar usuarios (filtros: ?estado, membresia, vencidas)');
    console.log('  GET /usuarios/:id - Ver usuario individual');
    console.log('  PUT /usuarios/:id - Actualizar usuario');
    console.log('  PUT /usuarios/:id/estado - Cambiar estado');
    console.log('  DELETE /usuarios/:id - Eliminar usuario');
    console.log('  POST /usuarios/:id/visita - Registrar visita');
    console.log('  GET /usuarios/estadisticas - Estadísticas usuarios');
    console.log('\n🛒 PRODUCTOS:');
    console.log('  GET /productos - Listar productos (filtros: ?categoria, estado, stock_bajo)');
    console.log('  GET /productos/:id - Ver producto individual');
    console.log('  POST /productos - Crear producto (filtros: ?categoria, estado, stock_bajo)');
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
    console.log('  POST /entrenadores - Crear entrenador (filtros: ?nombre, apellido, especialidad, estado)');
    console.log('  PUT /entrenadores/:id - Actualizar entrenador');
    console.log('  DELETE /entrenadores/:id - Eliminar entrenador');
    console.log('  GET /entrenadores/:id/horarios - Listar horarios');
    console.log('  POST /entrenadores/:id/horarios - Crear horario (filtros: ?dia_semana, hora_inicio, hora_fin, disponible)');
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
    console.log('\n📋 SESIONES:');
    console.log('  GET /sesiones - Listar sesiones (filtros: ?fecha_desde, fecha_hasta, usuario_id)');
    console.log('  POST /sesiones - Crear sesión');
    console.log('  PUT /sesiones/:id - Actualizar sesión');
    console.log('  DELETE /sesiones/:id - Eliminar sesión');
    console.log('  GET /sesiones/:id - Ver sesión individual');
    console.log('\n🏷️ PAGOS:');
    console.log('  GET /pagos - Listar pagos (filtros: ?usuario_id, tipo_pago, estado, fecha_desde, fecha_hasta)');
    console.log('  GET /pagos/:id - Ver pago individual');
    console.log('  POST /pagos - Crear pago (filtros: ?usuario_id, tipo_pago, monto, estado, fecha)');
    console.log('  PUT /pagos/:id - Actualizar pago');
    console.log('  DELETE /pagos/:id - Cancelar pago');
    console.log('  POST /pagos/renovar-membresia - Renovar membresía con pago');
    console.log('\n📊 ESTADÍSTICAS DE PAGOS:');
    console.log('  GET /pagos/estadisticas - Estadísticas de pagos');
    console.log('  GET /pagos/estadisticas/membresias - Estadísticas de membresías');
    console.log('  GET /pagos/estadisticas/productos - Estadísticas de productos');
    console.log('  GET /pagos/estadisticas/sesiones - Estadísticas de sesiones');
    console.log('\n📄 REPORTES:');
    console.log('  GET /reportes/ingresos-mensuales - Ingresos mensuales del año actual');
    console.log('  GET /reportes/usuarios-nuevos-mensuales - Usuarios nuevos mensuales del año actual');
    console.log('  GET /reportes/productos-mas-vendidos - Productos más vendidos');
    console.log('  GET /reportes/rutinas-populares - Rutinas más populares');
    console.log('  GET /reportes/usuarios-con-membresia-por-vencer - Usuarios con membresía por vencer');
    console.log('  GET /reportes/usuarios-inactivos - Usuarios inactivos en los últimos 30 días');
    console.log('  GET /reportes/ventas-por-usuario - Ventas por usuario');
    console.log('  GET /reportes/ventas-por-producto - Ventas por producto');

    console.log('\n💳 FACTURAS:');
    console.log('  GET /facturas - Listar facturas (filtros: ?usuario_id, estado, fecha_desde, fecha_hasta)');
    console.log('  GET /facturas/:id - Ver factura completa con detalles');
    console.log('  POST /facturas - Crear factura');
    console.log('  PUT /facturas/:id - Actualizar factura');
    console.log('  DELETE /facturas/:id - Eliminar factura');
    
});