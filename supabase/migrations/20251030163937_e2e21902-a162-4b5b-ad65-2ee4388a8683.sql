-- Modificar tabla pharmacy_medications para coincidir con la estructura del CSV
ALTER TABLE public.pharmacy_medications
  ADD COLUMN IF NOT EXISTS ubicacion TEXT,
  ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS forma_farmaceutica TEXT,
  ADD COLUMN IF NOT EXISTS stock_inicial INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entrada INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salida INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comentarios TEXT;

-- Renombrar columnas para coincidir mejor con el CSV
ALTER TABLE public.pharmacy_medications
  RENAME COLUMN commercial_name TO descripcion;

ALTER TABLE public.pharmacy_medications
  RENAME COLUMN batch_number TO lote;

ALTER TABLE public.pharmacy_medications
  RENAME COLUMN expiration_date TO fecha_vencimiento;

ALTER TABLE public.pharmacy_medications
  RENAME COLUMN stock_quantity TO stock_actual;

ALTER TABLE public.pharmacy_medications
  RENAME COLUMN reference_sale_price TO precio_venta;

-- Hacer algunas columnas opcionales
ALTER TABLE public.pharmacy_medications
  ALTER COLUMN active_ingredient DROP NOT NULL,
  ALTER COLUMN concentration DROP NOT NULL,
  ALTER COLUMN lote DROP NOT NULL,
  ALTER COLUMN fecha_vencimiento DROP NOT NULL,
  ALTER COLUMN purchase_price DROP NOT NULL;

-- Actualizar el trigger para generar códigos en lugar de barcodes
DROP TRIGGER IF EXISTS set_medication_barcode_trigger ON public.pharmacy_medications;

CREATE OR REPLACE FUNCTION public.generate_medication_code_auto()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    counter INTEGER;
BEGIN
    -- Obtener el último número de código
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 2) AS INTEGER)), 0) + 1
    INTO counter
    FROM pharmacy_medications
    WHERE codigo ~ '^P[0-9]+$';
    
    LOOP
        new_code := 'P' || counter::TEXT;
        SELECT EXISTS(SELECT 1 FROM pharmacy_medications WHERE codigo = new_code) INTO code_exists;
        IF NOT code_exists THEN
            EXIT;
        END IF;
        counter := counter + 1;
    END LOOP;
    RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_medication_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := generate_medication_code_auto();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_medication_codigo_trigger
  BEFORE INSERT ON public.pharmacy_medications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_medication_codigo();

-- Actualizar la función generate_medication_code para mantener compatibilidad
CREATE OR REPLACE FUNCTION public.generate_medication_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    RETURN generate_medication_code_auto();
END;
$$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pharmacy_medications_codigo ON public.pharmacy_medications(codigo);
CREATE INDEX IF NOT EXISTS idx_pharmacy_medications_ubicacion ON public.pharmacy_medications(ubicacion);
CREATE INDEX IF NOT EXISTS idx_pharmacy_medications_descripcion ON public.pharmacy_medications(descripcion);