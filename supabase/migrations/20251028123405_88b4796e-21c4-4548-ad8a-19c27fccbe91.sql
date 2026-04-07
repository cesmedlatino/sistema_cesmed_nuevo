-- Eliminar campos de seguro de la tabla patients
ALTER TABLE patients 
DROP COLUMN IF EXISTS insurance_provider,
DROP COLUMN IF EXISTS insurance_number;