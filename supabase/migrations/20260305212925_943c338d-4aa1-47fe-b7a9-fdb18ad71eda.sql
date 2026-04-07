
-- Trigger: auto-log movement when pharmacy_entries is inserted
CREATE OR REPLACE FUNCTION public.log_pharmacy_entry_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.medication_id IS NOT NULL THEN
    INSERT INTO public.pharmacy_inventory_movements (
      medication_id, movement_type, movement_reason, quantity,
      previous_stock, new_stock, unit_cost, total_cost,
      reference_document, observations, created_by
    )
    SELECT
      NEW.medication_id,
      'Entrada',
      COALESCE(NEW.entry_type, 'Compra'),
      COALESCE(NEW.quantity_received, NEW.quantity_requested, 0),
      m.stock_actual - COALESCE(NEW.quantity_received, NEW.quantity_requested, 0),
      m.stock_actual,
      NEW.purchase_cost_per_unit,
      NEW.total_amount,
      NEW.invoice_number,
      'Entrada automática - ' || COALESCE(NEW.description, ''),
      NEW.created_by
    FROM public.pharmacy_medications m
    WHERE m.id = NEW.medication_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_pharmacy_entry ON public.pharmacy_entries;
CREATE TRIGGER trg_log_pharmacy_entry
  AFTER INSERT ON public.pharmacy_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pharmacy_entry_movement();

-- Trigger: auto-log movement when pharmacy_outputs is inserted
CREATE OR REPLACE FUNCTION public.log_pharmacy_output_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.medication_id IS NOT NULL THEN
    INSERT INTO public.pharmacy_inventory_movements (
      medication_id, movement_type, movement_reason, quantity,
      previous_stock, new_stock, unit_cost, total_cost,
      reference_document, observations, created_by
    )
    SELECT
      NEW.medication_id,
      'Salida',
      COALESCE(NEW.tipo_salida, 'Venta'),
      NEW.quantity,
      m.stock_actual + NEW.quantity,
      m.stock_actual,
      NEW.sale_cost_per_unit,
      NEW.total,
      NEW.nro_comprobante,
      'Salida automática - ' || COALESCE(NEW.comments, COALESCE(NEW.description, '')),
      NEW.created_by
    FROM public.pharmacy_medications m
    WHERE m.id = NEW.medication_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_pharmacy_output ON public.pharmacy_outputs;
CREATE TRIGGER trg_log_pharmacy_output
  AFTER INSERT ON public.pharmacy_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pharmacy_output_movement();

-- Trigger: auto-log movement when pharmacy_medications stock is updated
CREATE OR REPLACE FUNCTION public.log_pharmacy_medication_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stock_actual IS DISTINCT FROM NEW.stock_actual THEN
    INSERT INTO public.pharmacy_inventory_movements (
      medication_id, movement_type, movement_reason, quantity,
      previous_stock, new_stock, unit_cost, observations, created_by
    )
    VALUES (
      NEW.id,
      CASE WHEN NEW.stock_actual > OLD.stock_actual THEN 'Entrada' ELSE 'Salida' END,
      'Ajuste Manual',
      ABS(NEW.stock_actual - OLD.stock_actual),
      OLD.stock_actual,
      NEW.stock_actual,
      NEW.precio_venta,
      'Edición manual del producto - Stock cambió de ' || OLD.stock_actual || ' a ' || NEW.stock_actual,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_pharmacy_stock_change ON public.pharmacy_medications;
CREATE TRIGGER trg_log_pharmacy_stock_change
  AFTER UPDATE ON public.pharmacy_medications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pharmacy_medication_stock_change();
