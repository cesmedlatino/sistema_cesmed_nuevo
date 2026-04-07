
-- Función para calcular purchase_price y campos relacionados desde pharmacy_entries
CREATE OR REPLACE FUNCTION calculate_missing_purchase_prices()
RETURNS TABLE(
  updated_count INTEGER,
  medication_id UUID,
  codigo TEXT,
  calculated_purchase_price NUMERIC,
  new_precio_venta NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH calculated_prices AS (
    SELECT 
      pm.id,
      pm.codigo,
      COALESCE(pm.porcentaje_ganancia, 0) as porcentaje_ganancia,
      -- Calcular purchase_price desde pharmacy_entries (última entrada)
      (SELECT pe.importe / NULLIF(pe.quantity_received, 0)
       FROM pharmacy_entries pe
       WHERE pe.product_code = pm.codigo
         AND pe.quantity_received > 0
         AND pe.importe IS NOT NULL
       ORDER BY pe.created_at DESC
       LIMIT 1) as calc_purchase_price
    FROM pharmacy_medications pm
    WHERE pm.purchase_price IS NULL
  ),
  updated_records AS (
    UPDATE pharmacy_medications pm
    SET 
      purchase_price = cp.calc_purchase_price,
      igv_unitario = cp.calc_purchase_price * 0.18,
      importe_unitario = cp.calc_purchase_price * 1.18,
      importe_ganancia = (cp.calc_purchase_price * 1.18) * (cp.porcentaje_ganancia / 100),
      precio_venta = (cp.calc_purchase_price * 1.18) + ((cp.calc_purchase_price * 1.18) * (cp.porcentaje_ganancia / 100)),
      comentarios = CASE 
        WHEN pm.comentarios IS NULL OR pm.comentarios = '' THEN 'Calculado'
        ELSE pm.comentarios || ' | Calculado'
      END,
      updated_at = now()
    FROM calculated_prices cp
    WHERE pm.id = cp.id
      AND cp.calc_purchase_price IS NOT NULL
      AND cp.calc_purchase_price > 0
    RETURNING pm.id, pm.codigo, cp.calc_purchase_price, pm.precio_venta
  )
  SELECT 
    COUNT(*)::INTEGER as updated_count,
    ur.id as medication_id,
    ur.codigo,
    ur.calc_purchase_price as calculated_purchase_price,
    ur.precio_venta as new_precio_venta
  FROM updated_records ur
  GROUP BY ur.id, ur.codigo, ur.calc_purchase_price, ur.precio_venta;
END;
$$;

-- Ejecutar la función y mostrar resultados
SELECT * FROM calculate_missing_purchase_prices();
