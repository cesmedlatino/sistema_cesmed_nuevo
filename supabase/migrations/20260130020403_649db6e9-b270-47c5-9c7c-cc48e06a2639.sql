-- Primero, verificar y eliminar duplicados si existen
-- (dejando el registro con mayor created_at)
WITH duplicates AS (
  SELECT id, pago_id, 
    ROW_NUMBER() OVER (PARTITION BY pago_id ORDER BY created_at DESC) as rn
  FROM pagos
  WHERE pago_id IS NOT NULL
)
DELETE FROM pagos 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Añadir restricción UNIQUE en pago_id
ALTER TABLE pagos 
ADD CONSTRAINT pagos_pago_id_unique UNIQUE (pago_id);

-- Recrear la función generate_pago_id con bloqueo advisory para prevenir race conditions
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
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    -- Obtener lock advisory para serializar la generación de pago_id
    PERFORM pg_advisory_xact_lock(hashtext('generate_pago_id'));
    
    -- Get current month and day
    current_month := TO_CHAR(NOW(), 'MM');
    current_day := TO_CHAR(NOW(), 'DD');
    
    LOOP
        attempt := attempt + 1;
        IF attempt > max_attempts THEN
            RAISE EXCEPTION 'No se pudo generar un pago_id único después de % intentos', max_attempts;
        END IF;
        
        -- Get next correlativo for PagoID (ahora con FOR UPDATE para bloquear)
        SELECT COALESCE(MAX(CAST(SUBSTRING(pago_id FROM 2 FOR 6) AS INTEGER)), 0) + 1
        INTO new_correlativo
        FROM pagos
        WHERE pago_id IS NOT NULL;
        
        -- Generate new PagoID with format PXXXXXX-MMDD
        new_pago_id := 'P' || LPAD(new_correlativo::TEXT, 6, '0') || '-' || current_month || current_day;
        
        -- Ya no necesitamos verificar existencia gracias al lock, pero lo mantenemos por seguridad
        IF NOT EXISTS(SELECT 1 FROM pagos WHERE pago_id = new_pago_id) THEN
            EXIT;
        END IF;
        
        -- Si existe (caso improbable), incrementar contador
        new_correlativo := new_correlativo + 1;
    END LOOP;
    
    RETURN new_pago_id;
END;
$function$;