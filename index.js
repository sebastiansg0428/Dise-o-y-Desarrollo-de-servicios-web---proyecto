// Importación de dependencias necesarias
const express = require('express') // Framework web para Node.js
const mysql = require('mysql2'); // Driver de MySQL para Node.js
const cors = require('cors'); // Middleware para permitir peticiones cross-origin

// Inicialización de la aplicación Express
const app = express()

app.use(express.json()); // Permitir peticiones JSON

// Middleware para permitir peticiones desde React
app.use(cors())
app.use(express.json()) // Para parsear JSON en el body
app.use(express.static('public')) // Servir archivos estáticos
const port = 3001 // Puerto donde correrá el servidor

// Configuración del pool de conexiones a la base de datos MySQL
// Un pool permite reutilizar conexiones y mejorar el rendimiento
const pool = mysql.createPool({
    host: 'localhost', // Servidor de base de datos
    user: 'root',      // Usuario de MySQL
    database: 'meli',  // Nombre de la base de datos
});



// Endpoint para el login de usuarios
// Método POST: enviar JSON { email: string, password: string }
app.post('/login', async (req, res) => {
    // Extrae email y password del body (JSON)
    const { email, password } = req.body

    console.log('=== LOGIN ATTEMPT ===')
    console.log('Email:', email)
    console.log('Password:', password)

    try {
        // Primero buscar si el email existe
        const [emailCheck] = await pool.promise()
            .query('SELECT `id`, `email`, `password` FROM `usuarios` WHERE email = ?', [email]);

        console.log('Email found:', emailCheck.length > 0)
        if (emailCheck.length > 0) {
            console.log('Stored password:', emailCheck[0].password)
            console.log('Provided password:', password)
            console.log('Passwords match:', emailCheck[0].password === password)
        }

        // Consulta a la base de datos para verificar las credenciales
        // Usa prepared statements (?) para prevenir inyección SQL
        const [rows] = await pool.promise()
            .query('SELECT `id`, `email`, `password` FROM `usuarios` WHERE email = ? AND password = ?', [email, password]);

        console.log('Login result:', rows.length > 0 ? 'SUCCESS' : 'FAILED')
        console.log('=====================')

        // Verifica si se encontró algún usuario con esas credenciales
        if (rows.length > 0) {
            res.send('login successful') // Usuario encontrado
        } else {
            res.send('invalid credentials') // Credenciales incorrectas
        }
    } catch (error) {
        console.log('Database error:', error.message)
        res.send('database error') // Error de base de datos
    }
})

// Endpoint para el registro de nuevos usuarios
// Método POST: enviar JSON { email: string, password: string }
app.post('/register', async (req, res) => {
    // Extrae email y password del body (JSON)
    const { email, password } = req.body

    console.log('=== REGISTER ATTEMPT ===')
    console.log('Email:', email)
    console.log('Password:', password)

    try {
        // Inserta un nuevo usuario en la base de datos
        // Usa prepared statements (?) para seguridad
        const [rows] = await pool.promise()
            .query('INSERT INTO `usuarios` (`email`, `password`) VALUES (?, ?)', [email, password]);

        console.log('Register result: SUCCESS')
        console.log('=====================')

        // Verifica si la inserción fue exitosa
        if (rows.affectedRows > 0) {
            res.send('register successful') // Usuario creado exitosamente
        } else {
            res.send('register failed') // Error al crear usuario
        }
    } catch (error) {
        console.log('Register error:', error.message)
        console.log('=====================')
        if (error.code === 'ER_DUP_ENTRY') {
            res.send('email already exists') // Email ya existe
        } else {
            res.send('register failed') // Otro error
        }
    }
})

// Endpoint para ver todos los usuarios
app.get('/usuarios/', async (req, res) => {
    try {
        const [rows] = await pool.promise()
            .query('SELECT `id`, `email`, DATE_FORMAT(created_at, "%d/%m/%Y %H:%i") as fecha_registro FROM `usuarios` ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        // Si no existe la columna created_at, usar consulta simple
        try {
            const [simpleRows] = await pool.promise()
                .query('SELECT `id`, `email` FROM `usuarios` ORDER BY id DESC');
            res.json(simpleRows);
        } catch (simpleError) {
            res.json({ error: simpleError.message });
        }
    }
})

// Endpoint para ver un usuario por ID
app.get('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    // Validar que el id sea numérico
    if (!/^[0-9]+$/.test(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        // Intentar devolver la fecha formateada si la columna existe
        const [rows] = await pool.promise().query(
            'SELECT id, email, DATE_FORMAT(created_at, "%d/%m/%Y %H:%i") as fecha_registro FROM usuarios WHERE id = ?',
            [id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        return res.json(rows[0]);
    } catch (error) {
        // Si la columna created_at no existe, hacer un fallback a una consulta simple
        if (error && error.code === 'ER_BAD_FIELD_ERROR') {
            try {
                const [rows] = await pool.promise().query('SELECT id, email FROM usuarios WHERE id = ?', [id]);
                if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
                return res.json(rows[0]);
            } catch (err2) {
                return res.status(500).json({ error: err2.message });
            }
        }
        return res.status(500).json({ error: error.message });
    }
});



// 🆕 Eliminar usuario por ID (nuevo endpoint)
app.delete('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.promise().query('DELETE FROM usuarios WHERE id = ?', [id]);
        if (result.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// -----------------------
// Endpoints para productos
// -----------------------

// Listar productos
app.get('/productos', async (req, res) => {
    try {
        const [rows] = await pool.promise()
            .query('SELECT `id`, `nombre`, `descripcion`, `categoria`, `stock`, `precio_compra`, `precio_venta`, DATE_FORMAT(created_at, "%d/%m/%Y %H:%i") as fecha_creacion FROM `productos` ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        try {
            const [simpleRows] = await pool.promise()
                .query('SELECT `id`, `nombre`, `descripcion`, `categoria`, `stock`, `precio_compra`, `precio_venta` FROM `productos` ORDER BY id DESC');
            res.json(simpleRows);
        } catch (simpleError) {
            res.json({ error: simpleError.message });
        }
    }
});

// Obtener producto por id
app.get('/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM productos WHERE id = ?', [id]);
        if (rows.length > 0) res.json(rows[0]);
        else res.json({ error: 'Producto no encontrado' });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Crear producto
app.post('/productos', async (req, res) => {
    const { nombre, descripcion, categoria, stock, precio_compra, precio_venta } = req.body;
    try {
        const [result] = await pool.promise().query(
            'INSERT INTO productos (nombre, descripcion, categoria, stock, precio_compra, precio_venta) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, descripcion || null, categoria || null, stock || 0, precio_compra || 0, precio_venta || 0]
        );
        if (result.affectedRows > 0) {
            res.json({ success: true, id: result.insertId });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Actualizar producto
app.put('/productos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, categoria, stock, precio_compra, precio_venta } = req.body;
    try {
        const [result] = await pool.promise().query(
            'UPDATE productos SET nombre = ?, descripcion = ?, categoria = ?, stock = ?, precio_compra = ?, precio_venta = ? WHERE id = ?',
            [nombre, descripcion || null, categoria || null, stock || 0, precio_compra || 0, precio_venta || 0, id]
        );
        if (result.affectedRows > 0) res.json({ success: true });
        else res.json({ success: false, message: 'Producto no encontrado' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Eliminar producto
app.delete('/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.promise().query('DELETE FROM productos WHERE id = ?', [id]);
        if (result.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Calcular ganancia por producto (por unidad y total según stock)
app.get('/productos/:id/ganancia', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.promise().query('SELECT precio_compra, precio_venta, stock FROM productos WHERE id = ?', [id]);
        if (rows.length === 0) return res.json({ error: 'Producto no encontrado' });
        const { precio_compra, precio_venta, stock } = rows[0];
        const unidad_compra = parseFloat(precio_compra);
        const unidad_venta = parseFloat(precio_venta);
        const ganancia_unitaria = unidad_venta - unidad_compra;
        const ganancia_total = ganancia_unitaria * (Number(stock) || 0);
        res.json({ ganancia_unitaria: ganancia_unitaria.toFixed(2), ganancia_total: ganancia_total.toFixed(2), stock: Number(stock) });
    } catch (error) {
        res.json({ error: error.message });
    }
});





    // -----------------------
    // Endpoints para rutinas y ejercicios
    // -----------------------

    // Listar todas las rutinas
    app.get('/rutinas', async (req, res) => {
        try {
            const [rows] = await pool.promise().query('SELECT * FROM rutinas ORDER BY id DESC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Obtener una rutina por id, incluyendo ejercicios ordenados
    app.get('/rutinas/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const [rutinas] = await pool.promise().query('SELECT * FROM rutinas WHERE id = ?', [id]);
            if (rutinas.length === 0) return res.status(404).json({ error: 'Rutina no encontrada' });

            const [ejercicios] = await pool.promise().query(
                `SELECT re.id as re_id, e.id as ejercicio_id, e.nombre, e.grupo_muscular, e.equipo, e.tipo, re.orden, re.series, re.repeticiones_min, re.repeticiones_max, re.descanso_seg, re.peso_kg, re.notas
                 FROM rutina_ejercicios re
                 JOIN ejercicios e ON re.ejercicio_id = e.id
                 WHERE re.rutina_id = ?
                 ORDER BY re.orden ASC`,
                [id]
            );

            res.json({ rutina: rutinas[0], ejercicios });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Crear una nueva rutina
    app.post('/rutinas', async (req, res) => {
        const { nombre, descripcion, nivel, objetivo, duracion_semanas, frecuencia_por_semana } = req.body;
        try {
            const [result] = await pool.promise().query(
                'INSERT INTO rutinas (nombre, descripcion, nivel, objetivo, duracion_semanas, frecuencia_por_semana) VALUES (?, ?, ?, ?, ?, ?)',
                [nombre, descripcion || null, nivel || null, objetivo || null, duracion_semanas || null, frecuencia_por_semana || null]
            );
            res.json({ success: true, id: result.insertId });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Actualizar rutina
    app.put('/rutinas/:id', async (req, res) => {
        const { id } = req.params;
        const { nombre, descripcion, nivel, objetivo, duracion_semanas, frecuencia_por_semana } = req.body;
        try {
            const [result] = await pool.promise().query(
                'UPDATE rutinas SET nombre = ?, descripcion = ?, nivel = ?, objetivo = ?, duracion_semanas = ?, frecuencia_por_semana = ? WHERE id = ?',
                [nombre, descripcion || null, nivel || null, objetivo || null, duracion_semanas || null, frecuencia_por_semana || null, id]
            );
            if (result.affectedRows > 0) res.json({ success: true });
            else res.status(404).json({ success: false, message: 'Rutina no encontrada' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Eliminar rutina
    app.delete('/rutinas/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const [result] = await pool.promise().query('DELETE FROM rutinas WHERE id = ?', [id]);
            if (result.affectedRows > 0) res.json({ success: true });
            else res.status(404).json({ success: false, message: 'Rutina no encontrada' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Añadir ejercicio a una rutina
    app.post('/rutinas/:id/ejercicios', async (req, res) => {
        const { id } = req.params; // rutina id
        const { ejercicio_id, orden, series, repeticiones_min, repeticiones_max, descanso_seg, peso_kg, notas } = req.body;
        try {
            const [result] = await pool.promise().query(
                'INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, orden, series, repeticiones_min, repeticiones_max, descanso_seg, peso_kg, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, ejercicio_id, orden || 0, series || null, repeticiones_min || null, repeticiones_max || null, descanso_seg || null, peso_kg || null, notas || null]
            );
            res.json({ success: true, id: result.insertId });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Actualizar una entrada rutina_ejercicios
    app.put('/rutinas/ejercicios/:id', async (req, res) => {
        const { id } = req.params;
        const { orden, series, repeticiones_min, repeticiones_max, descanso_seg, peso_kg, notas } = req.body;
        try {
            const [result] = await pool.promise().query(
                'UPDATE rutina_ejercicios SET orden = ?, series = ?, repeticiones_min = ?, repeticiones_max = ?, descanso_seg = ?, peso_kg = ?, notas = ? WHERE id = ?',
                [orden || 0, series || null, repeticiones_min || null, repeticiones_max || null, descanso_seg || null, peso_kg || null, notas || null, id]
            );
            if (result.affectedRows > 0) res.json({ success: true });
            else res.status(404).json({ success: false, message: 'Entrada no encontrada' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Eliminar ejercicio de una rutina (entrada)
    app.delete('/rutinas/ejercicios/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const [result] = await pool.promise().query('DELETE FROM rutina_ejercicios WHERE id = ?', [id]);
            if (result.affectedRows > 0) res.json({ success: true });
            else res.status(404).json({ success: false, message: 'Entrada no encontrada' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // CRUD para ejercicios
    app.get('/ejercicios', async (req, res) => {
        try {
            const [rows] = await pool.promise().query('SELECT * FROM ejercicios ORDER BY id DESC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/ejercicios', async (req, res) => {
        const { nombre, descripcion, grupo_muscular, equipo, tipo } = req.body;
        try {
            const [result] = await pool.promise().query(
                'INSERT INTO ejercicios (nombre, descripcion, grupo_muscular, equipo, tipo) VALUES (?, ?, ?, ?, ?)',
                [nombre, descripcion || null, grupo_muscular || null, equipo || null, tipo || null]
            );
            res.json({ success: true, id: result.insertId });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Asignar una rutina a un usuario
    app.post('/usuarios/:id/rutinas', async (req, res) => {
        const { id } = req.params; // usuario id
        const { rutina_id, fecha_inicio, fecha_fin, estado, progreso } = req.body;
        try {
            const [result] = await pool.promise().query(
                'INSERT INTO usuarios_rutinas (usuario_id, rutina_id, fecha_inicio, fecha_fin, estado, progreso) VALUES (?, ?, ?, ?, ?, ?)',
                [id, rutina_id, fecha_inicio || new Date(), fecha_fin || null, estado || 'activa', progreso || null]
            );
            res.json({ success: true, id: result.insertId });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Listar rutinas asignadas a un usuario
    app.get('/usuarios/:id/rutinas', async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await pool.promise().query(
                `SELECT ur.id as asignacion_id, ur.usuario_id, ur.rutina_id, r.nombre as rutina_nombre, ur.fecha_inicio, ur.fecha_fin, ur.estado, ur.progreso
                 FROM usuarios_rutinas ur
                 JOIN rutinas r ON ur.rutina_id = r.id
                 WHERE ur.usuario_id = ?
                 ORDER BY ur.fecha_inicio DESC`,
                [id]
            );
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Actualizar asignación (por ejemplo cambiar estado o progreso)
    app.put('/usuarios/:usuarioId/rutinas/:asignacionId', async (req, res) => {
        const { usuarioId, asignacionId } = req.params;
        const { fecha_fin, estado, progreso } = req.body;
        try {
            const [result] = await pool.promise().query(
                'UPDATE usuarios_rutinas SET fecha_fin = ?, estado = ?, progreso = ? WHERE id = ? AND usuario_id = ?',
                [fecha_fin || null, estado || null, progreso || null, asignacionId, usuarioId]
            );
            if (result.affectedRows > 0) res.json({ success: true });
            else res.status(404).json({ success: false, message: 'Asignación no encontrada' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

// Inicia el servidor en el puerto especificado
// El servidor quedará escuchando peticiones HTTP
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`)
    console.log('Páginas disponibles:')
    console.log('- http://localhost:3001/ (Login/Registro)')
    console.log('- http://localhost:3001/home.html (Home con usuarios)')
    console.log('Endpoints API:')
    console.log('- POST /login (body JSON: { email, password })')
    console.log('- POST /register (body JSON: { email, password })')
    console.log('- GET /usuarios (listado de usuarios)')
    console.log('- GET /productos (listado de productos)')
    console.log('- GET /productos/:id (producto por id)')
    console.log('- POST /productos (crear producto) {nombre, descripcion, categoria, stock, precio_compra, precio_venta}')
    console.log('- PUT /productos/:id (actualizar producto)')
    console.log('- DELETE /productos/:id (eliminar producto)')
    console.log('- GET /productos/:id/ganancia (calcular ganancia por producto)')
    console.log('- GET /rutinas (listado de rutinas)')
    console.log('- POST /rutinas (crear rutina) {nombre, descripcion, nivel, objetivo, duracion_semanas, frecuencia_por_semana}')
    console.log('- PUT /rutinas/:id (actualizar rutina)')
    console.log('- DELETE /rutinas/:id (eliminar rutina)')
    console.log('- POST /rutinas/:id/ejercicios (agregar ejercicio a rutina)')
    console.log('- PUT /rutinas/ejercicios/:id (actualizar ejercicio)')
    console.log('- DELETE /rutinas/ejercicios/:id (eliminar ejercicio)')
    console.log('- GET /ejercicios (listado de ejercicios)')
    console.log('- POST /ejercicios (crear ejercicio) {nombre, descripcion, grupo_muscular, equipo, tipo}')
    console.log('- GET /usuarios/:id/rutinas (listado de rutinas asignadas a un usuario)')
    console.log('- POST /usuarios/:id/rutinas (asignar una rutina a un usuario)')
    console.log('- PUT /usuarios/:usuarioId/rutinas/:asignacionId (actualizar asignación)')
})
