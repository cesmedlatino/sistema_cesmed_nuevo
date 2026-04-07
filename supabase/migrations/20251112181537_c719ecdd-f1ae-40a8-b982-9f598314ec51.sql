-- Add importe field to pharmacy_entries
ALTER TABLE public.pharmacy_entries
ADD COLUMN importe numeric GENERATED ALWAYS AS (quantity_received * purchase_cost_per_unit) STORED;

-- Update the trigger function to sum importe instead of total_amount
CREATE OR REPLACE FUNCTION public.update_invoice_header()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Calcular totales y obtener datos de la factura sumando el campo importe
  SELECT 
    COALESCE(SUM(importe), 0),
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
$function$;

-- Update the delete trigger function to use importe
CREATE OR REPLACE FUNCTION public.update_invoice_header_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Recalcular totales sumando el campo importe
    SELECT 
      COALESCE(SUM(importe), 0),
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
$function$;