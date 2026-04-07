-- Agregar validación para permitir solo un horario activo por especialista
-- Actualizar tabla horarios para agregar constraint único para especialista_id donde estado = 'activo'

-- Crear un índice parcial único para garantizar que solo un horario esté activo por especialista
CREATE UNIQUE INDEX unique_active_schedule_per_specialist 
ON horarios (specialist_id) 
WHERE estado = 'activo';

-- Agregar comentario para explicar la restricción
COMMENT ON INDEX unique_active_schedule_per_specialist IS 'Garantiza que cada especialista tenga solo un horario activo al mismo tiempo';

-- Función para verificar que el horario es válido antes de activarlo
CREATE OR REPLACE FUNCTION validate_active_schedule_per_specialist()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está intentando activar un horario
    IF NEW.estado = 'activo' AND NEW.specialist_id IS NOT NULL THEN
        -- Verificar si ya existe otro horario activo para este especialista
        IF EXISTS (
            SELECT 1 FROM horarios 
            WHERE specialist_id = NEW.specialist_id 
            AND estado = 'activo' 
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Ya existe un horario activo para este especialista. Solo puede tener un horario activo al mismo tiempo.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que ejecuta la función de validación
CREATE TRIGGER trigger_validate_active_schedule_per_specialist
    BEFORE INSERT OR UPDATE ON horarios
    FOR EACH ROW
    EXECUTE FUNCTION validate_active_schedule_per_specialist();