
-- Habilitar RLS en la tabla personal
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuarios autenticados vean todos los registros de personal
CREATE POLICY "Usuarios autenticados pueden ver personal" 
  ON public.personal 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Política para permitir que usuarios autenticados inserten registros de personal
CREATE POLICY "Usuarios autenticados pueden crear personal" 
  ON public.personal 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir que usuarios autenticados actualicen registros de personal
CREATE POLICY "Usuarios autenticados pueden actualizar personal" 
  ON public.personal 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Política para permitir que usuarios autenticados eliminen registros de personal
CREATE POLICY "Usuarios autenticados pueden eliminar personal" 
  ON public.personal 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);
