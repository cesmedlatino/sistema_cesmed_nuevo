-- Función para recalcular entrada, salida y stock actual de un medicamento
CREATE OR REPLACE FUNCTION public.recalculate_medication_stock(p_medication_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_entrada INTEGER;
  v_total_salida INTEGER;
  v_stock_inicial INTEGER;
  v_stock_actual INTEGER;
BEGIN
  -- Obtener stock inicial
  SELECT stock_inicial INTO v_stock_inicial
  FROM pharmacy_medications
  WHERE id = p_medication_id;
  
  -- Calcular total de entradas (quantity_received)
  SELECT COALESCE(SUM(quantity_received), 0) INTO v_total_entrada
  FROM pharmacy_entries
  WHERE medication_id = p_medication_id;
  
  -- Calcular total de salidas (quantity)
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_salida
  FROM pharmacy_outputs
  WHERE medication_id = p_medication_id;
  
  -- Calcular stock actual: Stock Inicial + Entrada - Salida
  v_stock_actual := v_stock_inicial + v_total_entrada - v_total_salida;
  
  -- Actualizar el medicamento
  UPDATE pharmacy_medications
  SET 
    entrada = v_total_entrada,
    salida = v_total_salida,
    stock_actual = v_stock_actual,
    updated_at = NOW()
  WHERE id = p_medication_id;
END;
$$;

-- Trigger para pharmacy_entries
CREATE OR REPLACE FUNCTION public.trigger_recalculate_stock_on_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_medication_stock(OLD.medication_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_medication_stock(NEW.medication_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER recalculate_stock_after_entry
AFTER INSERT OR UPDATE OR DELETE ON pharmacy_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_stock_on_entry();

-- Trigger para pharmacy_outputs
CREATE OR REPLACE FUNCTION public.trigger_recalculate_stock_on_output()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_medication_stock(OLD.medication_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_medication_stock(NEW.medication_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER recalculate_stock_after_output
AFTER INSERT OR UPDATE OR DELETE ON pharmacy_outputs
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_stock_on_output();