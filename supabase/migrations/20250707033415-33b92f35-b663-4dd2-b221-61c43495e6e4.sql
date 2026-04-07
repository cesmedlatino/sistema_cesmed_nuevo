
-- Eliminar registros existentes en medical_records para evitar conflictos de referencias
DELETE FROM medical_records;

-- Eliminar registros relacionados en prescriptions que puedan referenciar medical_records
DELETE FROM prescriptions WHERE medical_record_id IS NOT NULL;

-- Reestructurar la tabla medical_records para hacerla flexible
-- Primero eliminamos las columnas específicas que ya no necesitamos
ALTER TABLE medical_records 
DROP COLUMN IF EXISTS chief_complaint,
DROP COLUMN IF EXISTS present_illness,
DROP COLUMN IF EXISTS physical_examination,
DROP COLUMN IF EXISTS diagnosis,
DROP COLUMN IF EXISTS treatment_plan,
DROP COLUMN IF EXISTS lab_results,
DROP COLUMN IF EXISTS imaging_results,
DROP COLUMN IF EXISTS follow_up_instructions,
DROP COLUMN IF EXISTS next_appointment_date,
DROP COLUMN IF EXISTS vital_signs;

-- Agregar nuevas columnas para el sistema flexible
ALTER TABLE medical_records 
ADD COLUMN template_id UUID REFERENCES medical_record_templates(id),
ADD COLUMN record_number TEXT,
ADD COLUMN form_data JSONB DEFAULT '{}',
ADD COLUMN status TEXT DEFAULT 'En Progreso',
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN completed_by UUID;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_medical_records_template_id ON medical_records(template_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_template ON medical_records(patient_id, template_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_number ON medical_records(record_number);
CREATE INDEX IF NOT EXISTS idx_medical_records_form_data ON medical_records USING GIN(form_data);

-- Función para generar números de historia clínica
CREATE OR REPLACE FUNCTION generate_medical_record_number(template_prefix TEXT, zeros_count INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    next_number INTEGER;
    record_number TEXT;
BEGIN
    -- Obtener el siguiente número secuencial para esta plantilla
    SELECT COALESCE(MAX(
        CASE 
            WHEN record_number ~ ('^' || template_prefix || '-[0-9]+$')
            THEN CAST(SUBSTRING(record_number FROM LENGTH(template_prefix) + 2) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM medical_records
    WHERE record_number LIKE template_prefix || '-%';
    
    -- Formatear el número con la cantidad de ceros especificada
    record_number := template_prefix || '-' || LPAD(next_number::TEXT, zeros_count, '0');
    
    RETURN record_number;
END;
$$;

-- Trigger para generar automáticamente el número de historia clínica
CREATE OR REPLACE FUNCTION set_medical_record_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    template_config JSONB;
    prefix TEXT;
    zeros INTEGER;
BEGIN
    -- Obtener configuración de la plantilla
    SELECT header_config INTO template_config
    FROM medical_record_templates
    WHERE id = NEW.template_id;
    
    IF template_config IS NOT NULL THEN
        prefix := COALESCE(template_config->>'record_number_prefix', 'HC');
        zeros := COALESCE((template_config->>'record_number_zeros')::INTEGER, 6);
        
        NEW.record_number := generate_medical_record_number(prefix, zeros);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_set_medical_record_number ON medical_records;
CREATE TRIGGER trigger_set_medical_record_number
    BEFORE INSERT ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION set_medical_record_number();

-- Actualizar las políticas RLS para incluir la nueva estructura
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear historias clínicas" ON medical_records;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver historias clínicas" ON medical_records;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar historias clínicas" ON medical_records;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar historias clínicas" ON medical_records;

CREATE POLICY "Users can create medical records"
ON medical_records FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view medical records"
ON medical_records FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update medical records"
ON medical_records FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete medical records"
ON medical_records FOR DELETE
USING (is_admin_by_role());

-- Función para validar datos del formulario contra la plantilla
CREATE OR REPLACE FUNCTION validate_medical_record_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    template_body JSONB;
    section JSONB;
    field JSONB;
    field_value TEXT;
BEGIN
    -- Obtener la configuración del cuerpo de la plantilla
    SELECT body_config INTO template_body
    FROM medical_record_templates
    WHERE id = NEW.template_id;
    
    -- Validar que los campos requeridos estén presentes
    FOR section IN SELECT * FROM jsonb_array_elements(template_body)
    LOOP
        FOR field IN SELECT * FROM jsonb_array_elements(section->'fields')
        LOOP
            -- Si el campo es requerido, verificar que tenga valor
            IF (field->>'required')::BOOLEAN = true THEN
                field_value := NEW.form_data->>((field->>'id'));
                IF field_value IS NULL OR field_value = '' THEN
                    RAISE EXCEPTION 'El campo % es requerido', field->>'name';
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Crear trigger de validación
DROP TRIGGER IF EXISTS trigger_validate_medical_record_data ON medical_records;
CREATE TRIGGER trigger_validate_medical_record_data
    BEFORE INSERT OR UPDATE ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION validate_medical_record_data();
