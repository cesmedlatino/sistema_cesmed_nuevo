-- Crear función para generar el código de paciente con el nuevo formato
CREATE OR REPLACE FUNCTION public.generate_patient_code_v2(p_first_name TEXT, p_last_name TEXT, p_correlativo INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    letra_a TEXT;
    letra_b TEXT;
    letra_c TEXT;
    letra_d TEXT;
    letra_e TEXT;
    correlativo_formateado TEXT;
BEGIN
    -- Formatear el correlativo con 6 dígitos
    correlativo_formateado := LPAD(p_correlativo::TEXT, 6, '0');
    
    -- Generar las 5 letras en MAYÚSCULA
    letra_a := COALESCE(UPPER(SUBSTRING(p_first_name FROM 1 FOR 1)), 'X');
    letra_b := COALESCE(UPPER(SUBSTRING(p_first_name FROM 2 FOR 1)), 'X');
    letra_c := COALESCE(UPPER(SUBSTRING(p_last_name FROM 1 FOR 1)), 'X');
    letra_d := COALESCE(UPPER(SUBSTRING(p_last_name FROM 2 FOR 1)), 'X');
    letra_e := COALESCE(UPPER(SUBSTRING(p_last_name FROM LENGTH(p_last_name) FOR 1)), 'X');
    
    -- Retornar el código completo
    RETURN 'PAC-' || correlativo_formateado || '-' || letra_a || letra_b || letra_c || letra_d || letra_e;
END;
$$;

-- Actualizar la función generate_patient_code para usar el nuevo formato
CREATE OR REPLACE FUNCTION public.generate_patient_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    counter INTEGER;
BEGIN
    -- Obtener el último número de código
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM 5 FOR 6) AS INTEGER)), 0) + 1
    INTO counter
    FROM patients
    WHERE patient_code ~ '^PAC-[0-9]{6}-[A-Z]{5}$';
    
    -- Nota: Esta función genera un código temporal
    -- El trigger set_patient_code_v2 lo reemplazará con el código correcto
    RETURN 'PAC-' || LPAD(counter::TEXT, 6, '0') || '-XXXXX';
END;
$$;

-- Crear nuevo trigger que genere el código con nombre y apellido
CREATE OR REPLACE FUNCTION public.set_patient_code_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    counter INTEGER;
BEGIN
    IF NEW.patient_code IS NULL OR NEW.patient_code = '' THEN
        -- Obtener el siguiente correlativo
        SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM 5 FOR 6) AS INTEGER)), 0) + 1
        INTO counter
        FROM patients
        WHERE patient_code ~ '^PAC-[0-9]{6}-[A-Z]{5}$';
        
        -- Generar el código con el nuevo formato
        NEW.patient_code := generate_patient_code_v2(NEW.first_name, NEW.last_name, counter);
    END IF;
    RETURN NEW;
END;
$$;

-- Eliminar el trigger antiguo si existe
DROP TRIGGER IF EXISTS set_patient_code_trigger ON patients;

-- Crear el nuevo trigger
CREATE TRIGGER set_patient_code_trigger
    BEFORE INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION set_patient_code_v2();

-- Función para actualizar todos los códigos existentes
CREATE OR REPLACE FUNCTION public.update_all_patient_codes()
RETURNS TABLE(updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    patient_record RECORD;
    counter INTEGER := 1;
    total_updated INTEGER := 0;
BEGIN
    -- Iterar sobre todos los pacientes ordenados por fecha de creación
    FOR patient_record IN 
        SELECT id, first_name, last_name, created_at
        FROM patients
        ORDER BY created_at ASC, id ASC
    LOOP
        -- Actualizar el código del paciente
        UPDATE patients
        SET patient_code = generate_patient_code_v2(patient_record.first_name, patient_record.last_name, counter)
        WHERE id = patient_record.id;
        
        counter := counter + 1;
        total_updated := total_updated + 1;
    END LOOP;
    
    RETURN QUERY SELECT total_updated;
END;
$$;

-- Ejecutar la actualización de todos los pacientes existentes
SELECT update_all_patient_codes();