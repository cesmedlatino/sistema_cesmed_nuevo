-- Actualizar la tabla patients para que solo first_name, last_name y dni sean requeridos
-- Hacer que la mayoría de campos sean opcionales (nullable)

ALTER TABLE public.patients 
ALTER COLUMN birth_date DROP NOT NULL,
ALTER COLUMN gender DROP NOT NULL,
ALTER COLUMN blood_type DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN emergency_contact_name DROP NOT NULL,
ALTER COLUMN emergency_contact_phone DROP NOT NULL,
ALTER COLUMN address DROP NOT NULL,
ALTER COLUMN allergies DROP NOT NULL,
ALTER COLUMN chronic_conditions DROP NOT NULL,
ALTER COLUMN insurance_provider DROP NOT NULL,
ALTER COLUMN insurance_number DROP NOT NULL,
ALTER COLUMN created_by DROP NOT NULL,
ALTER COLUMN updated_by DROP NOT NULL;

-- Establecer valores por defecto para arrays
ALTER TABLE public.patients 
ALTER COLUMN allergies SET DEFAULT '{}',
ALTER COLUMN chronic_conditions SET DEFAULT '{}';

-- Hacer que first_name y last_name sean requeridos (NOT NULL)
ALTER TABLE public.patients 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;