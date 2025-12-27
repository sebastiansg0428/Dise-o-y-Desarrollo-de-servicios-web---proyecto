-- Actualizar el estado del entrenador recién creado a 'activo'
UPDATE entrenadores SET estado = 'activo' WHERE id = 4;

-- Verificar todos los entrenadores
SELECT id, nombre, apellido, especialidad_principal, estado FROM entrenadores;
