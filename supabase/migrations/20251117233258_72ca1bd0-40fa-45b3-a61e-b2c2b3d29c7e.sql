-- Add formula_magistral column to pharmacy_medications
ALTER TABLE public.pharmacy_medications
ADD COLUMN formula_magistral boolean DEFAULT false;

-- Create pedido_formula_magistral table
CREATE TABLE public.pedido_formula_magistral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nro_formula text UNIQUE NOT NULL,
  formula text NOT NULL,
  id_paciente uuid REFERENCES public.patients(id),
  numero_contacto text,
  cantidad integer NOT NULL DEFAULT 1,
  monto_pedido numeric,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.pedido_formula_magistral ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all for authenticated users on pedido_formula_magistral"
  ON public.pedido_formula_magistral
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to generate nro_formula
CREATE OR REPLACE FUNCTION public.generate_nro_formula()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    counter INTEGER;
BEGIN
    -- Get the last number
    SELECT COALESCE(MAX(CAST(SUBSTRING(nro_formula FROM 4) AS INTEGER)), 0) + 1
    INTO counter
    FROM pedido_formula_magistral
    WHERE nro_formula ~ '^FM-[0-9]+$';
    
    LOOP
        new_code := 'FM-' || LPAD(counter::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM pedido_formula_magistral WHERE nro_formula = new_code) INTO code_exists;
        IF NOT code_exists THEN
            EXIT;
        END IF;
        counter := counter + 1;
    END LOOP;
    RETURN new_code;
END;
$$;

-- Trigger to auto-generate nro_formula
CREATE OR REPLACE FUNCTION public.set_nro_formula()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.nro_formula IS NULL OR NEW.nro_formula = '' THEN
    NEW.nro_formula := generate_nro_formula();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_nro_formula
  BEFORE INSERT ON public.pedido_formula_magistral
  FOR EACH ROW
  EXECUTE FUNCTION public.set_nro_formula();