
-- Primero, eliminar la restricción actual
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Crear una nueva restricción que incluya "Sin Programar"
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('Programada', 'Completada', 'Anulada', 'Cancelada', 'No Asistió', 'En Proceso', 'Sin Programar'));

-- Ahora actualizar el estado de las citas que tienen consultorio "No asignado" a "Sin Programar"
UPDATE public.appointments 
SET status = 'Sin Programar' 
WHERE consulting_room_id IS NULL 
AND status != 'Anulada' 
AND status != 'Completada';
