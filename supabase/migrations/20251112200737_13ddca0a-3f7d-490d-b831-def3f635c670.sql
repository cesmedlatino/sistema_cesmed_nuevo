-- Actualizar función para reconocer estado Cancelado
CREATE OR REPLACE FUNCTION public.update_invoice_header()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_date DATE;
  v_due_date DATE;
  v_status TEXT;
  v_supplier_id UUID;
  v_payment_type TEXT;
BEGIN
  -- Solo procesar si hay invoice_number
  IF COALESCE(NEW.invoice_number, '') = '' THEN
    RETURN NEW;
  END IF;

  -- Calcular totales y obtener datos de la factura
  SELECT 
    COALESCE(SUM(importe), 0),
    MIN(date),
    MAX(invoice_due_date),
    CASE 
      -- Si TODAS las entradas están canceladas, la factura está cancelada
      WHEN BOOL_AND(payment_status = 'Cancelado') THEN 'Cancelado'
      -- Si TODAS las entradas están pagadas, la factura está pagada
      WHEN BOOL_AND(payment_status = 'Pagado') THEN 'Pagado'
      -- Si ALGUNAS entradas están pagadas, la factura está parcial
      WHEN BOOL_OR(payment_status = 'Pagado') THEN 'Parcial'
      -- De lo contrario, está pendiente
      ELSE 'Pendiente'
    END,
    (SELECT supplier_id FROM public.pharmacy_entries WHERE invoice_number = NEW.invoice_number LIMIT 1),
    (SELECT payment_type FROM public.pharmacy_entries WHERE invoice_number = NEW.invoice_number LIMIT 1)
  INTO v_total, v_date, v_due_date, v_status, v_supplier_id, v_payment_type
  FROM public.pharmacy_entries
  WHERE invoice_number = NEW.invoice_number;

  -- Insertar o actualizar encabezado
  INSERT INTO public.invoice_headers (
    invoice_number,
    date,
    due_date,
    status,
    total_amount,
    supplier_id,
    payment_type,
    created_by,
    updated_by
  ) VALUES (
    NEW.invoice_number,
    v_date,
    v_due_date,
    v_status,
    v_total,
    v_supplier_id,
    v_payment_type,
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (invoice_number) 
  DO UPDATE SET
    date = v_date,
    due_date = v_due_date,
    status = v_status,
    total_amount = v_total,
    supplier_id = v_supplier_id,
    payment_type = v_payment_type,
    updated_at = now(),
    updated_by = auth.uid();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Actualizar función de eliminación para reconocer estado Cancelado
CREATE OR REPLACE FUNCTION public.update_invoice_header_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_date DATE;
  v_due_date DATE;
  v_status TEXT;
  v_count INTEGER;
  v_supplier_id UUID;
  v_payment_type TEXT;
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
      COALESCE(SUM(importe), 0),
      MIN(date),
      MAX(invoice_due_date),
      CASE 
        -- Si TODAS las entradas están canceladas, la factura está cancelada
        WHEN BOOL_AND(payment_status = 'Cancelado') THEN 'Cancelado'
        -- Si TODAS las entradas están pagadas, la factura está pagada
        WHEN BOOL_AND(payment_status = 'Pagado') THEN 'Pagado'
        -- Si ALGUNAS entradas están pagadas, la factura está parcial
        WHEN BOOL_OR(payment_status = 'Pagado') THEN 'Parcial'
        -- De lo contrario, está pendiente
        ELSE 'Pendiente'
      END,
      (SELECT supplier_id FROM public.pharmacy_entries WHERE invoice_number = OLD.invoice_number AND id != OLD.id LIMIT 1),
      (SELECT payment_type FROM public.pharmacy_entries WHERE invoice_number = OLD.invoice_number AND id != OLD.id LIMIT 1)
    INTO v_total, v_date, v_due_date, v_status, v_supplier_id, v_payment_type
    FROM public.pharmacy_entries
    WHERE invoice_number = OLD.invoice_number
    AND id != OLD.id;

    -- Actualizar encabezado
    UPDATE public.invoice_headers SET
      date = v_date,
      due_date = v_due_date,
      status = v_status,
      total_amount = v_total,
      supplier_id = v_supplier_id,
      payment_type = v_payment_type,
      updated_at = now(),
      updated_by = auth.uid()
    WHERE invoice_number = OLD.invoice_number;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;