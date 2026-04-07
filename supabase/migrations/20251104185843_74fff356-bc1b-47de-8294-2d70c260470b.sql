-- Agregar columnas observations y specialty a pharmacy_suppliers
ALTER TABLE public.pharmacy_suppliers
ADD COLUMN IF NOT EXISTS observations text,
ADD COLUMN IF NOT EXISTS specialty text;

-- Actualizar comentarios de las columnas
COMMENT ON COLUMN public.pharmacy_suppliers.observations IS 'Observaciones adicionales sobre el proveedor';
COMMENT ON COLUMN public.pharmacy_suppliers.specialty IS 'Especialidad médica del proveedor';