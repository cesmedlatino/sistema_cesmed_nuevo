-- Agregar campo dias_laborables a la tabla turnos
ALTER TABLE public.turnos 
ADD COLUMN dias_laborables INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6];

-- Agregar comentario al campo
COMMENT ON COLUMN public.turnos.dias_laborables IS 'Días de la semana donde aplica el turno (1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado)';