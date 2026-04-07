
-- Actualizar la tabla medical_record_templates para incluir todos los campos necesarios
ALTER TABLE public.medical_record_templates 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS footer_signature_url TEXT,
ADD COLUMN IF NOT EXISTS footer_text TEXT;

-- Actualizar los campos JSONB para tener una estructura más clara
-- header_config almacenará: {"logo_url": "...", "title": "..."}
-- body_config almacenará: [{"id": "uuid", "title": "Section I", "roman_numeral": "I", "fields": [{"id": "uuid", "name": "Field Name", "type": "text_short", "required": true}]}]
-- footer_config almacenará: {"signature_url": "...", "text": "..."}

-- Función para generar números romanos
CREATE OR REPLACE FUNCTION int_to_roman(num INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    result TEXT := '';
    values INTEGER[] := ARRAY[1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    numerals TEXT[] := ARRAY['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(values, 1) LOOP
        WHILE num >= values[i] LOOP
            result := result || numerals[i];
            num := num - values[i];
        END LOOP;
    END LOOP;
    RETURN result;
END;
$$;
