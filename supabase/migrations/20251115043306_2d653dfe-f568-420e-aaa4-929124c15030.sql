-- Agregar columna especialidad a medical_records
ALTER TABLE medical_records
ADD COLUMN especialidad TEXT;

-- Renombrar columna age a years en patients
ALTER TABLE patients
RENAME COLUMN age TO years;