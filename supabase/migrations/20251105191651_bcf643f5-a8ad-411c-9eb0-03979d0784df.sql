-- Agregar campos de correlativo a comprobante_config
ALTER TABLE comprobante_config
ADD COLUMN correlative_prefix TEXT NOT NULL DEFAULT 'NV',
ADD COLUMN correlative_zeros INTEGER NOT NULL DEFAULT 6,
ADD COLUMN correlative_current INTEGER NOT NULL DEFAULT 0;

-- Crear función para generar el siguiente número de comprobante
CREATE OR REPLACE FUNCTION generate_next_comprobante_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record RECORD;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Obtener la configuración actual
  SELECT correlative_prefix, correlative_zeros, correlative_current
  INTO config_record
  FROM comprobante_config
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Si no hay configuración, usar valores por defecto
  IF NOT FOUND THEN
    RETURN 'NV-000001';
  END IF;
  
  -- Incrementar el número actual
  next_number := config_record.correlative_current + 1;
  
  -- Formatear el número con ceros a la izquierda
  formatted_number := config_record.correlative_prefix || '-' || 
                      LPAD(next_number::TEXT, config_record.correlative_zeros, '0');
  
  -- Actualizar el correlativo actual en la configuración
  UPDATE comprobante_config
  SET correlative_current = next_number
  WHERE id = (
    SELECT id FROM comprobante_config
    ORDER BY created_at DESC
    LIMIT 1
  );
  
  RETURN formatted_number;
END;
$$;

-- Crear trigger para generar número automático en documento_de_pago si no existe
CREATE OR REPLACE FUNCTION set_comprobante_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_documento IS NULL OR NEW.numero_documento = '' THEN
    NEW.numero_documento := generate_next_comprobante_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Reemplazar el trigger existente
DROP TRIGGER IF EXISTS set_document_number_trigger ON documento_de_pago;
CREATE TRIGGER set_document_number_trigger
BEFORE INSERT ON documento_de_pago
FOR EACH ROW
EXECUTE FUNCTION set_comprobante_number();