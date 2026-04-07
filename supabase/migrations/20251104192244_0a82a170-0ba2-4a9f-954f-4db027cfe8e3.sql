-- Agregar constraint único a la columna name en pharmacy_suppliers
-- Primero eliminamos duplicados si existen
DELETE FROM public.pharmacy_suppliers a
USING public.pharmacy_suppliers b
WHERE a.id > b.id 
AND a.name = b.name;

-- Agregar constraint único
ALTER TABLE public.pharmacy_suppliers
ADD CONSTRAINT pharmacy_suppliers_name_unique UNIQUE (name);

-- Comentario
COMMENT ON CONSTRAINT pharmacy_suppliers_name_unique ON public.pharmacy_suppliers 
IS 'Garantiza que no haya proveedores duplicados por nombre';