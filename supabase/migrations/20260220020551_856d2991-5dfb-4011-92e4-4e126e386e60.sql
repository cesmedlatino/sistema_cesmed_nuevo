
-- Create catalogo_general table
CREATE TABLE public.catalogo_general (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL,
  catalogo text NOT NULL DEFAULT 'Inventario General',
  nombre text NOT NULL,
  clasificacion text,
  marca text,
  modelo text,
  serie text,
  precio_venta numeric DEFAULT 0,
  stock_actual integer NOT NULL DEFAULT 0,
  ubicacion text,
  observacion text,
  status text NOT NULL DEFAULT 'Activo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT catalogo_general_codigo_key UNIQUE (codigo),
  CONSTRAINT catalogo_general_catalogo_check CHECK (catalogo IN ('Farmacia', 'Inventario General'))
);

-- Enable RLS
ALTER TABLE public.catalogo_general ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view catalogo_general"
  ON public.catalogo_general FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert catalogo_general"
  ON public.catalogo_general FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update catalogo_general"
  ON public.catalogo_general FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete catalogo_general"
  ON public.catalogo_general FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at
CREATE TRIGGER update_catalogo_general_updated_at
  BEFORE UPDATE ON public.catalogo_general
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
