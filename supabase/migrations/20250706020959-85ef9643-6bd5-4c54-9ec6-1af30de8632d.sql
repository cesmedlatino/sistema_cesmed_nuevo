
-- Eliminar la restricción existente que está causando el error
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check;

-- Crear una nueva restricción que coincida con los roles del sistema
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_check 
CHECK (rol IN ('administrador', 'especialista', 'asistente', 'recepcionista'));

-- Verificar que los usuarios existentes cumplen con la nueva restricción
UPDATE usuario 
SET rol = 'administrador' 
WHERE rol NOT IN ('administrador', 'especialista', 'asistente', 'recepcionista') 
AND activo = true;
