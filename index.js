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
// Método GET: /login?email=usuario@email.com&password=123456
app.post('/login', async (req, res) => {
    // Extrae email y password de los parámetros de la URL
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
// Método GET: /register?email=nuevo@email.com&password=123456
app.post('/register', async (req, res) => {
    // Extrae email y password de los parámetros de la URL
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
app.post('/usuarios', async (req, res) => {
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





// Inicia el servidor en el puerto especificado
// El servidor quedará escuchando peticiones HTTP
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`)
    console.log('Páginas disponibles:')
    console.log('- http://localhost:3001/ (Login/Registro)')
    console.log('- http://localhost:3001/home.html (Home con usuarios)')
    console.log('Endpoints API:')
    console.log('- GET /login?email=tu@email.com&password=tupassword')
    console.log('- GET /register?email=nuevo@email.com&password=nuevapassword')
    console.log('- GET /usuarios (listado de usuarios)')
})
