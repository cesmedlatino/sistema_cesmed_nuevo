-- Crear tabla para tipos de productos ópticos
CREATE TABLE public.optics_product_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.optics_product_types ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view optics product types" 
ON public.optics_product_types 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert optics product types" 
ON public.optics_product_types 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update optics product types" 
ON public.optics_product_types 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Insertar tipos predefinidos
INSERT INTO public.optics_product_types (value, label) VALUES
  ('montura', 'Montura'),
  ('lentes_contacto', 'Lentes de Contacto'),
  ('lentes_graduados', 'Lentes Graduados'),
  ('gafas_sol', 'Gafas de Sol'),
  ('accesorio', 'Accesorio');