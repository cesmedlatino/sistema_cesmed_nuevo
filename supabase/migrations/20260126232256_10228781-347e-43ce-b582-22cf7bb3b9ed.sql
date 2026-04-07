-- Update the generate_hms_for_template function to use MAX from medical_records instead of correlative_current
CREATE OR REPLACE FUNCTION public.generate_hms_for_template(p_template_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  template_record RECORD;
  next_number INTEGER;
  max_hms_number INTEGER;
  formatted_hms TEXT;
  prefix TEXT;
  zeros INTEGER;
BEGIN
  -- Obtener la configuración de la plantilla
  SELECT correlative_prefix, correlative_zeros, correlative_current
  INTO template_record
  FROM medical_record_templates
  WHERE id = p_template_id;
  
  -- Si no se encuentra la plantilla, usar valores por defecto
  IF NOT FOUND THEN
    RETURN 'HC-000001';
  END IF;
  
  prefix := COALESCE(template_record.correlative_prefix, 'HC');
  zeros := COALESCE(template_record.correlative_zeros, 6);
  
  -- Buscar el máximo número de HMS existente para este prefijo en medical_records
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(hms, '-', 2), '') AS INTEGER)
  ), 0)
  INTO max_hms_number
  FROM medical_records
  WHERE hms LIKE prefix || '-%';
  
  -- El siguiente número es el máximo + 1
  next_number := max_hms_number + 1;
  
  -- Formatear el HMS con ceros a la izquierda
  formatted_hms := prefix || '-' || LPAD(next_number::TEXT, zeros, '0');
  
  -- Actualizar el correlativo actual en la plantilla para mantenerlo sincronizado
  UPDATE medical_record_templates
  SET correlative_current = next_number
  WHERE id = p_template_id;
  
  RETURN formatted_hms;
END;
$function$;