-- Crear pagos para los usuarios que no tienen registro de pago
-- Este script crea automáticamente pagos con estado "pagado" para usuarios existentes

INSERT INTO pagos (usuario_id, tipo_pago, concepto, monto, metodo_pago, estado, fecha_pago)
SELECT 
    u.id,
    'membresia',
    CONCAT('Membresía ', u.membresia),
    u.precio_membresia,
    'efectivo',
    'pagado',
    COALESCE(u.fecha_inicio_membresia, u.created_at)
FROM usuarios u
LEFT JOIN pagos p ON u.id = p.usuario_id AND p.tipo_pago = 'membresia'
WHERE p.id IS NULL
AND u.estado = 'activo';

-- Verificar los pagos creados
SELECT 
    u.id,
    u.nombre,
    u.apellido,
    u.membresia,
    u.precio_membresia,
    p.concepto,
    p.monto,
    p.estado,
    DATE_FORMAT(p.fecha_pago, '%d/%m/%Y') as fecha_pago
FROM usuarios u
INNER JOIN pagos p ON u.id = p.usuario_id
WHERE p.tipo_pago = 'membresia'
ORDER BY u.id;
