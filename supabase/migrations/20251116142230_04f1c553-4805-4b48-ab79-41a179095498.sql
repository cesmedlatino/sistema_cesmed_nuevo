-- Agregar columna hms a medical_records
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS hms TEXT;

-- Agregar configuración de correlativo a medical_record_templates
ALTER TABLE public.medical_record_templates
ADD COLUMN IF NOT EXISTS correlative_prefix TEXT DEFAULT 'HC',
ADD COLUMN IF NOT EXISTS correlative_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correlative_zeros INTEGER DEFAULT 6;

-- Función para generar el HMS basado en la plantilla
CREATE OR REPLACE FUNCTION public.generate_hms_for_template(p_template_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  template_record RECORD;
  next_number INTEGER;
  formatted_hms TEXT;
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
  
  -- Incrementar el número actual
  next_number := COALESCE(template_record.correlative_current, 0) + 1;
  
  -- Formatear el HMS con ceros a la izquierda
  formatted_hms := COALESCE(template_record.correlative_prefix, 'HC') || '-' || 
                   LPAD(next_number::TEXT, COALESCE(template_record.correlative_zeros, 6), '0');
  
  -- Actualizar el correlativo actual en la plantilla
  UPDATE medical_record_templates
  SET correlative_current = next_number
  WHERE id = p_template_id;
  
  RETURN formatted_hms;
END;
$$;

-- Función trigger para generar HMS automáticamente al crear historia
CREATE OR REPLACE FUNCTION public.set_medical_record_hms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Solo generar HMS si no se proporciona uno y existe template_id
  IF (NEW.hms IS NULL OR NEW.hms = '') AND NEW.template_id IS NOT NULL THEN
    NEW.hms := generate_hms_for_template(NEW.template_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Crear trigger para generar HMS automáticamente
DROP TRIGGER IF EXISTS trigger_set_medical_record_hms ON public.medical_records;
CREATE TRIGGER trigger_set_medical_record_hms
  BEFORE INSERT ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_medical_record_hms();

-- Crear índice en la columna hms para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_medical_records_hms ON public.medical_records(hms);

-- Comentarios para documentación
COMMENT ON COLUMN public.medical_records.hms IS 'Número correlativo de historia médica generado automáticamente según la plantilla';
COMMENT ON COLUMN public.medical_record_templates.correlative_prefix IS 'Prefijo para el correlativo HMS (ej: HC, HO, HD)';
COMMENT ON COLUMN public.medical_record_templates.correlative_current IS 'Número correlativo actual para esta plantilla';
COMMENT ON COLUMN public.medical_record_templates.correlative_zeros IS 'Cantidad de ceros a la izquierda para el correlativo';
COMMENT ON FUNCTION public.generate_hms_for_template IS 'Genera el siguiente número HMS para una plantilla específica';
COMMENT ON FUNCTION public.set_medical_record_hms IS 'Trigger function que genera automáticamente el HMS al crear una historia clínica';