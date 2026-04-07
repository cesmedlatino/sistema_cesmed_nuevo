-- Drop the calculate_missing_purchase_prices function
DROP FUNCTION IF EXISTS public.calculate_missing_purchase_prices();

-- Revert the pharmacy_medications table to its previous state
-- Set calculated fields back to NULL for records that were auto-calculated
UPDATE public.pharmacy_medications
SET 
  purchase_price = NULL,
  igv_unitario = NULL,
  importe_unitario = NULL,
  importe_ganancia = NULL,
  precio_venta = NULL,
  comentarios = CASE
    -- Remove "Calculado" entirely if it's the only comment
    WHEN comentarios = 'Calculado' THEN NULL
    -- Remove " | Calculado" suffix
    WHEN comentarios LIKE '% | Calculado' THEN TRIM(REPLACE(comentarios, ' | Calculado', ''))
    -- Remove "Calculado | " prefix
    WHEN comentarios LIKE 'Calculado | %' THEN TRIM(REPLACE(comentarios, 'Calculado | ', ''))
    -- Keep original if no Calculado marker
    ELSE comentarios
  END,
  updated_at = NOW()
WHERE comentarios LIKE '%Calculado%';