// ========================================
// UTILIDADES PARA FORMATEAR PESOS COLOMBIANOS
// ========================================

/**
 * Formatea un número a pesos colombianos
 * @param {number|string} valor - El valor a formatear
 * @returns {string} - Valor formateado (ej: "$5.000", "$10.000")
 */
function formatearPesosColombianos(valor) {
    // Convertir a número si es string
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    
    // Si no es un número válido, retornar $0
    if (isNaN(numero)) return '$0';
    
    // Redondear a entero (en Colombia no se usan centavos)
    const entero = Math.round(numero);
    
    // Formatear con separador de miles (punto)
    return '$' + entero.toLocaleString('es-CO');
}

/**
 * Parsea un valor de pesos colombianos a número
 * @param {string} valor - Valor con formato "$5.000" o "5000"
 * @returns {number} - Número sin formato
 */
function parsearPesosColombianos(valor) {
    if (typeof valor === 'number') return valor;
    
    // Remover $ y puntos
    const limpio = valor.replace(/\$|\./g, '');
    return parseInt(limpio) || 0;
}

/**
 * Formatea input mientras el usuario escribe
 * @param {Event} event - Evento del input
 */
function formatearInputPesos(event) {
    const input = event.target;
    let valor = input.value.replace(/\D/g, ''); // Solo números
    
    if (valor === '') {
        input.value = '';
        return;
    }
    
    // Formatear con puntos
    const numero = parseInt(valor);
    input.value = numero.toLocaleString('es-CO');
}

// ========================================
// EJEMPLOS DE USO EN FRONTEND
// ========================================

/*
// EJEMPLO 1: Mostrar tarifa en tabla
const tarifa = entrenador.tarifa_rutina; // Backend devuelve: 5000
const tarifaFormateada = formatearPesosColombianos(tarifa);
console.log(tarifaFormateada); // "$5.000"


// EJEMPLO 2: Input con formateo automático
<input 
    type="text" 
    id="tarifa" 
    onkeyup="formatearInputPesos(event)"
    placeholder="Ej: 5.000"
/>


// EJEMPLO 3: Enviar al backend
const inputValor = document.getElementById('tarifa').value; // "5.000"
const valorNumerico = parsearPesosColombianos(inputValor); // 5000

fetch('/entrenadores', {
    method: 'POST',
    body: JSON.stringify({
        tarifa_rutina: valorNumerico // Enviar como número: 5000
    })
});


// EJEMPLO 4: React/Vue component
function TarifaDisplay({ tarifa }) {
    return <span>{formatearPesosColombianos(tarifa)}</span>;
}

// Uso: <TarifaDisplay tarifa={5000} />
// Muestra: $5.000
*/

// ========================================
// INTEGRACIÓN CON TU CÓDIGO ACTUAL
// ========================================

/*
// Si usas FETCH:
const response = await fetch('http://localhost:3001/entrenadores');
const entrenadores = await response.json();

// Mostrar en tabla HTML
entrenadores.forEach(e => {
    const tarifa = formatearPesosColombianos(e.tarifa_rutina);
    console.log(`${e.nombre}: ${tarifa}`); // "JACOB: $5.000"
});


// Si usas AXIOS:
const { data } = await axios.get('http://localhost:3001/entrenadores');

data.forEach(e => {
    e.tarifaFormateada = formatearPesosColombianos(e.tarifa_rutina);
});


// En template/HTML:
<tr v-for="entrenador in entrenadores" :key="entrenador.id">
    <td>{{ entrenador.nombre }}</td>
    <td>{{ formatearPesosColombianos(entrenador.tarifa_rutina) }}</td>
</tr>
*/

// ========================================
// VALIDACIÓN DE VALORES
// ========================================

/**
 * Valida que el valor sea un monto válido en pesos colombianos
 * @param {number|string} valor - Valor a validar
 * @returns {boolean} - true si es válido
 */
function esMontoValido(valor) {
    const numero = typeof valor === 'string' ? parsearPesosColombianos(valor) : valor;
    return !isNaN(numero) && numero >= 0 && numero <= 99999999;
}

/**
 * Valida input de tarifa en tiempo real
 * @param {string} valor - Valor del input
 * @returns {Object} - {valido, mensaje, valorNumerico}
 */
function validarTarifa(valor) {
    const numero = parsearPesosColombianos(valor);
    
    if (isNaN(numero)) {
        return { valido: false, mensaje: 'Ingrese solo números', valorNumerico: 0 };
    }
    
    if (numero < 0) {
        return { valido: false, mensaje: 'La tarifa no puede ser negativa', valorNumerico: 0 };
    }
    
    if (numero > 99999999) {
        return { valido: false, mensaje: 'La tarifa es demasiado alta', valorNumerico: 0 };
    }
    
    return { valido: true, mensaje: 'OK', valorNumerico: numero };
}

// ========================================
// COMPONENTE DE EJEMPLO (HTML + JavaScript)
// ========================================

/*
<!-- HTML -->
<div class="form-group">
    <label>Tarifa por Rutina (COP)</label>
    <input 
        type="text" 
        id="tarifa" 
        onkeyup="formatearInputPesos(event)"
        placeholder="Ej: 5.000"
    />
    <small id="tarifa-error" style="color: red;"></small>
</div>

<script>
// JavaScript
document.getElementById('tarifa').addEventListener('blur', function() {
    const validacion = validarTarifa(this.value);
    const errorSpan = document.getElementById('tarifa-error');
    
    if (!validacion.valido) {
        errorSpan.textContent = validacion.mensaje;
        this.style.borderColor = 'red';
    } else {
        errorSpan.textContent = '';
        this.style.borderColor = '';
    }
});

// Al enviar el formulario
function enviarFormulario() {
    const tarifaInput = document.getElementById('tarifa').value;
    const tarifaNumerica = parsearPesosColombianos(tarifaInput);
    
    fetch('/entrenadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre: 'JACOB',
            tarifa_rutina: tarifaNumerica // 5000 (sin formato)
        })
    });
}
</script>
*/

// ========================================
// EXPORTAR FUNCIONES (para módulos ES6)
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatearPesosColombianos,
        parsearPesosColombianos,
        formatearInputPesos,
        esMontoValido,
        validarTarifa
    };
}

// ========================================
// TESTING
// ========================================

// Descomentar para probar en consola
/*
console.log('=== PRUEBAS DE FORMATEO ===');
console.log(formatearPesosColombianos(5000));        // "$5.000"
console.log(formatearPesosColombianos(10000));       // "$10.000"
console.log(formatearPesosColombianos(50000));       // "$50.000"
console.log(formatearPesosColombianos(1000000));     // "$1.000.000"
console.log(formatearPesosColombianos('5000.00'));   // "$5.000"

console.log('\n=== PRUEBAS DE PARSEO ===');
console.log(parsearPesosColombianos('$5.000'));      // 5000
console.log(parsearPesosColombianos('10.000'));      // 10000
console.log(parsearPesosColombianos('50000'));       // 50000
console.log(parsearPesosColombianos(5000));          // 5000

console.log('\n=== PRUEBAS DE VALIDACIÓN ===');
console.log(validarTarifa('5.000'));                 // {valido: true, ...}
console.log(validarTarifa('-100'));                  // {valido: false, ...}
console.log(validarTarifa('abc'));                   // {valido: false, ...}
*/
