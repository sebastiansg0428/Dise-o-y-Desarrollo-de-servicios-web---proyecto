const jwt = require('jsonwebtoken');
const SECRET_KEY = 'gimnasio_secret_key_2026';

function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Acceso denegado. No se proporcionó token de autenticación.' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Token inválido o expirado.' 
        });
    }
}

module.exports = { verificarToken, SECRET_KEY };
