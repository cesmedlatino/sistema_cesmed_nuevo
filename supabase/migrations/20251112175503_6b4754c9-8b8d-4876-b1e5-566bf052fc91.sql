-- Crear tabla de encabezados de factura
CREATE TABLE IF NOT EXISTS public.invoice_headers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.invoice_headers ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Allow all for authenticated users on invoice_headers"
ON public.invoice_headers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Crear índice para búsquedas rápidas por número de factura
CREATE INDEX IF NOT EXISTS idx_invoice_headers_invoice_number 
ON public.invoice_headers(invoice_number);

-- Función para actualizar encabezados de factura
CREATE OR REPLACE FUNCTION public.update_invoice_header()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_date DATE;
  v_due_date DATE;
  v_status TEXT;
BEGIN
  -- Solo procesar si hay invoice_number
  IF COALESCE(NEW.invoice_number, '') = '' THEN
    RETURN NEW;
  END IF;

  -- Calcular totales y obtener datos de la factura
  SELECT 
    COALESCE(SUM(total_amount), 0),
    MIN(date),
    MAX(invoice_due_date),
    CASE 
      WHEN BOOL_AND(payment_status = 'Pagado') THEN 'Pagado'
      WHEN BOOL_OR(payment_status = 'Pagado') THEN 'Parcial'
      ELSE 'Pendiente'
    END
  INTO v_total, v_date, v_due_date, v_status
  FROM public.pharmacy_entries
  WHERE invoice_number = NEW.invoice_number;

  -- Insertar o actualizar encabezado
  INSERT INTO public.invoice_headers (
    invoice_number,
    date,
    due_date,
    status,
    total_amount,
    created_by,
    updated_by
  ) VALUES (
    NEW.invoice_number,
    v_date,
    v_due_date,
    v_status,
    v_total,
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (invoice_number) 
  DO UPDATE SET
    date = v_date,
    due_date = v_due_date,
    status = v_status,
    total_amount = v_total,
    updated_at = now(),
    updated_by = auth.uid();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para actualizar encabezados cuando se elimina una entrada
CREATE OR REPLACE FUNCTION public.update_invoice_header_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_date DATE;
  v_due_date DATE;
  v_status TEXT;
  v_count INTEGER;
BEGIN
  -- Solo procesar si hay invoice_number
  IF COALESCE(OLD.invoice_number, '') = '' THEN
    RETURN OLD;
  END IF;

  -- Verificar si quedan entradas con este número de factura
  SELECT COUNT(*) INTO v_count
  FROM public.pharmacy_entries
  WHERE invoice_number = OLD.invoice_number
  AND id != OLD.id;

  IF v_count = 0 THEN
    -- Si no quedan entradas, eliminar el encabezado
    DELETE FROM public.invoice_headers
    WHERE invoice_number = OLD.invoice_number;
  ELSE
    -- Recalcular totales
    SELECT 
      COALESCE(SUM(total_amount), 0),
      MIN(date),
      MAX(invoice_due_date),
      CASE 
        WHEN BOOL_AND(payment_status = 'Pagado') THEN 'Pagado'
        WHEN BOOL_OR(payment_status = 'Pagado') THEN 'Parcial'
        ELSE 'Pendiente'
      END
    INTO v_total, v_date, v_due_date, v_status
    FROM public.pharmacy_entries
    WHERE invoice_number = OLD.invoice_number
    AND id != OLD.id;

    -- Actualizar encabezado
    UPDATE public.invoice_headers SET
      date = v_date,
      due_date = v_due_date,
      status = v_status,
      total_amount = v_total,
      updated_at = now(),
      updated_by = auth.uid()
    WHERE invoice_number = OLD.invoice_number;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear triggers
DROP TRIGGER IF EXISTS trigger_update_invoice_header ON public.pharmacy_entries;
CREATE TRIGGER trigger_update_invoice_header
AFTER INSERT OR UPDATE ON public.pharmacy_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_header();

DROP TRIGGER IF EXISTS trigger_update_invoice_header_on_delete ON public.pharmacy_entries;
CREATE TRIGGER trigger_update_invoice_header_on_delete
AFTER DELETE ON public.pharmacy_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_header_on_delete();

-- Poblar tabla con datos existentes
INSERT INTO public.invoice_headers (invoice_number, date, due_date, status, total_amount)
SELECT 
  invoice_number,
  MIN(date) as date,
  MAX(invoice_due_date) as due_date,
  CASE 
    WHEN BOOL_AND(payment_status = 'Pagado') THEN 'Pagado'
    WHEN BOOL_OR(payment_status = 'Pagado') THEN 'Parcial'
    ELSE 'Pendiente'
  END as status,
  COALESCE(SUM(total_amount), 0) as total_amount
FROM public.pharmacy_entries
WHERE invoice_number IS NOT NULL AND invoice_number != ''
GROUP BY invoice_number
ON CONFLICT (invoice_number) DO NOTHING;