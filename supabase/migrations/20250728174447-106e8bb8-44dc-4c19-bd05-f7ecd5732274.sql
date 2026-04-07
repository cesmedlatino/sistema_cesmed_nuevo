-- Agregar campo specialist_id a la tabla horarios
ALTER TABLE horarios 
ADD COLUMN specialist_id UUID REFERENCES specialists(id);

-- Crear índice para mejorar el rendimiento
CREATE INDEX idx_horarios_specialist_id ON horarios(specialist_id);