-- ========================================
-- AJUSTE PARA PESOS COLOMBIANOS
-- ========================================
-- La tarifa_rutina ya soporta valores grandes como DECIMAL(10,2)
-- Esto permite guardar valores como 5000.00, 10000.00, 50000.00
-- NO es necesario cambiar la estructura de la tabla

-- ========================================
-- VERIFICACIÓN DEL TIPO DE DATO ACTUAL
-- ========================================
-- El campo tarifa_rutina es DECIMAL(10,2)
-- Esto significa:
--   - 10 dígitos en total
--   - 2 decimales
--   - Máximo valor: 99,999,999.99
--   - Perfecto para pesos colombianos

-- ========================================
-- EJEMPLO DE VALORES VÁLIDOS
-- ========================================
-- $5,000 COP    → Se guarda como: 5000.00
-- $10,000 COP   → Se guarda como: 10000.00
-- $50,000 COP   → Se guarda como: 50000.00
-- $100,000 COP  → Se guarda como: 100000.00
-- $1,000,000 COP → Se guarda como: 1000000.00

-- ========================================
-- PRUEBA: Actualizar un entrenador
-- ========================================
-- UPDATE entrenadores 
-- SET tarifa_rutina = 5000.00 
-- WHERE id = 12;

-- SELECT id, nombre, apellido, tarifa_rutina 
-- FROM entrenadores 
-- WHERE id = 12;
-- Debe mostrar: tarifa_rutina = 5000.00

-- ========================================
-- NOTA IMPORTANTE
-- ========================================
-- El problema NO está en la base de datos
-- El problema está en cómo el FRONTEND muestra el valor
-- El backend devuelve correctamente: "tarifa_rutina": "5000.00"
-- Pero el frontend puede estar dividiendo por 100 o formateando mal

COMMIT;
