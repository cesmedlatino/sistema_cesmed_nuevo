-- Actualizar la función para usar formato MMDD (mes y día) en lugar de MMYY (mes y año)
CREATE OR REPLACE FUNCTION public.generate_pago_id()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    new_correlativo INTEGER;
    new_pago_id TEXT;
    current_month TEXT;
    current_day TEXT;
    pago_id_exists BOOLEAN;
BEGIN
    -- Get current month and day
    current_month := TO_CHAR(NOW(), 'MM');
    current_day := TO_CHAR(NOW(), 'DD');
    
    LOOP
        -- Get next correlativo for PagoID
        SELECT COALESCE(MAX(CAST(SUBSTRING(pago_id FROM 2 FOR 6) AS INTEGER)), 0) + 1
        INTO new_correlativo
        FROM pagos
        WHERE pago_id IS NOT NULL;
        
        -- Generate new PagoID with format PXXXXXX-MMDD
        new_pago_id := 'P' || LPAD(new_correlativo::TEXT, 6, '0') || '-' || current_month || current_day;
        
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM pagos WHERE pago_id = new_pago_id) INTO pago_id_exists;
        
        IF NOT pago_id_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_pago_id;
END;
$function$;