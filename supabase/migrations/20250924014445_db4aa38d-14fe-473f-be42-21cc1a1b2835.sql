-- Add new columns to pagos table
ALTER TABLE public.pagos 
ADD COLUMN pago_id TEXT,
ADD COLUMN cuenta_id TEXT;

-- Create function to generate PagoID
CREATE OR REPLACE FUNCTION public.generate_pago_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    new_correlativo INTEGER;
    new_pago_id TEXT;
    current_month TEXT;
    current_year TEXT;
    pago_id_exists BOOLEAN;
BEGIN
    -- Get current month and year
    current_month := TO_CHAR(NOW(), 'MM');
    current_year := TO_CHAR(NOW(), 'YY');
    
    LOOP
        -- Get next correlativo for PagoID
        SELECT COALESCE(MAX(CAST(SUBSTRING(pago_id FROM 2 FOR 6) AS INTEGER)), 0) + 1
        INTO new_correlativo
        FROM pagos
        WHERE pago_id IS NOT NULL;
        
        -- Generate new PagoID
        new_pago_id := 'P' || LPAD(new_correlativo::TEXT, 6, '0') || '-' || current_month || current_year;
        
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM pagos WHERE pago_id = new_pago_id) INTO pago_id_exists;
        
        IF NOT pago_id_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_pago_id;
END;
$$;

-- Create function to generate CuentaID
CREATE OR REPLACE FUNCTION public.generate_cuenta_id(patient_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    patient_record RECORD;
    new_correlativo INTEGER;
    new_cuenta_id TEXT;
    apellido_code TEXT;
    nombre_code TEXT;
    fecha_actual TEXT;
    cuenta_id_exists BOOLEAN;
BEGIN
    -- Get patient information
    SELECT first_name, last_name INTO patient_record
    FROM patients
    WHERE id = patient_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found';
    END IF;
    
    -- Generate codes from names (uppercase, first 2 letters)
    apellido_code := UPPER(SUBSTRING(patient_record.last_name FROM 1 FOR 2));
    nombre_code := UPPER(SUBSTRING(patient_record.first_name FROM 1 FOR 2));
    
    -- Get current date
    fecha_actual := TO_CHAR(NOW(), 'DDMMYY');
    
    -- Check if CuentaID already exists for this patient
    SELECT cuenta_id INTO new_cuenta_id
    FROM pagos
    WHERE patient_id = patient_uuid
    AND cuenta_id IS NOT NULL
    LIMIT 1;
    
    -- If CuentaID exists for this patient, return it
    IF new_cuenta_id IS NOT NULL THEN
        RETURN new_cuenta_id;
    END IF;
    
    LOOP
        -- Get next correlativo for CuentaID
        SELECT COALESCE(MAX(CAST(SUBSTRING(cuenta_id FROM 2 FOR 4) AS INTEGER)), 0) + 1
        INTO new_correlativo
        FROM pagos
        WHERE cuenta_id IS NOT NULL;
        
        -- Generate new CuentaID
        new_cuenta_id := 'C' || LPAD(new_correlativo::TEXT, 4, '0') || '-' || apellido_code || nombre_code || '-' || fecha_actual;
        
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM pagos WHERE cuenta_id = new_cuenta_id) INTO cuenta_id_exists;
        
        IF NOT cuenta_id_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_cuenta_id;
END;
$$;

-- Create trigger function to set PagoID and CuentaID automatically
CREATE OR REPLACE FUNCTION public.set_pago_and_cuenta_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Set PagoID if not provided
    IF NEW.pago_id IS NULL OR NEW.pago_id = '' THEN
        NEW.pago_id := generate_pago_id();
    END IF;
    
    -- Set CuentaID if not provided and patient_id exists
    IF (NEW.cuenta_id IS NULL OR NEW.cuenta_id = '') AND NEW.patient_id IS NOT NULL THEN
        NEW.cuenta_id := generate_cuenta_id(NEW.patient_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic ID generation
CREATE TRIGGER trigger_set_pago_and_cuenta_ids
    BEFORE INSERT ON public.pagos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_pago_and_cuenta_ids();