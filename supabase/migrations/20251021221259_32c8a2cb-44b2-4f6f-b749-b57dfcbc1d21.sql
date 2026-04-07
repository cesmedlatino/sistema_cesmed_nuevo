-- Agregar campo edad a la tabla patients
ALTER TABLE public.patients 
ADD COLUMN age INTEGER;

-- Agregar comentario al campo
COMMENT ON COLUMN public.patients.age IS 'Edad del paciente calculada automáticamente desde birth_date';