-- Eliminar la restricción única que impide múltiples turnos por día
-- Esta restricción está impidiendo asignar múltiples turnos al mismo horario en el mismo día
ALTER TABLE horario_turno_assignments 
DROP CONSTRAINT IF EXISTS horario_turno_assignments_horario_id_day_of_week_key;

-- Crear un índice compuesto para optimizar las consultas pero sin restricción única
CREATE INDEX IF NOT EXISTS idx_horario_turno_assignments_horario_day_turno 
ON horario_turno_assignments(horario_id, day_of_week, turno_id);

-- Agregar una restricción única más específica que permita múltiples turnos pero evite duplicados exactos
ALTER TABLE horario_turno_assignments 
ADD CONSTRAINT horario_turno_assignments_unique_assignment 
UNIQUE (horario_id, day_of_week, turno_id);