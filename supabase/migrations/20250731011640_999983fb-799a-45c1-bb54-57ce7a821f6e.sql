-- Agregar campos para gestión de turnos de atención a la tabla appointments
ALTER TABLE appointments 
ADD COLUMN queue_position INTEGER,
ADD COLUMN checked_in_at TIMESTAMP WITH TIME ZONE;