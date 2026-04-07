-- Agregar campos de edad detallada a la tabla patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS months integer,
ADD COLUMN IF NOT EXISTS days integer,
ADD COLUMN IF NOT EXISTS hms text;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN public.patients.months IS 'Meses de edad calculados desde la fecha de nacimiento';
COMMENT ON COLUMN public.patients.days IS 'Días de edad calculados desde la fecha de nacimiento';
COMMENT ON COLUMN public.patients.hms IS 'Edad en formato HMS (años-meses-días)';