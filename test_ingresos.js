const mysql = require('mysql2');

// Conexión a la base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'meli',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testIngresos() {
    try {
        console.log('🔍 Probando consulta de ingresos...\n');
        
        // Consulta de ingresos del mes actual
        const [ingresosStats] = await pool.promise().query(`
            SELECT 
                COALESCE(SUM(CASE WHEN estado = 'pagado' AND MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE()) THEN monto ELSE 0 END), 0) as ingresos_mes_actual,
                COALESCE(SUM(CASE WHEN estado = 'pagado' AND MONTH(fecha_pago) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_pago) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) THEN monto ELSE 0 END), 0) as ingresos_mes_anterior
            FROM pagos
        `);
        
        console.log('📊 Resultados de ingresos:');
        console.log('Ingresos mes actual:', ingresosStats[0].ingresos_mes_actual);
        console.log('Ingresos mes anterior:', ingresosStats[0].ingresos_mes_anterior);
        console.log('\n');
        
        // Ver todos los pagos del mes actual
        const [pagosMesActual] = await pool.promise().query(`
            SELECT id, usuario_id, tipo_pago, monto, estado, fecha_pago
            FROM pagos
            WHERE MONTH(fecha_pago) = MONTH(CURDATE()) 
            AND YEAR(fecha_pago) = YEAR(CURDATE())
            ORDER BY fecha_pago DESC
        `);
        
        console.log(`📋 Pagos del mes actual (${pagosMesActual.length} registros):`);
        pagosMesActual.forEach(pago => {
            console.log(`  - ID: ${pago.id}, Usuario: ${pago.usuario_id}, Tipo: ${pago.tipo_pago}, Monto: ${pago.monto}, Estado: ${pago.estado}, Fecha: ${pago.fecha_pago}`);
        });
        
        console.log('\n✅ Test completado');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testIngresos();
