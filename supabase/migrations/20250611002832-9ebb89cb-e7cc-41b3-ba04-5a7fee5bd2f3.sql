
-- Crear tabla horarios
CREATE TABLE public.horarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dias_laborables INTEGER[] NOT NULL, -- Array de números del 0-6 (0=Domingo, 1=Lunes, etc.)
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('activo', 'inactivo', 'suspendido', 'borrador')),
  clinic_id UUID REFERENCES public.clinics(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Habilitar RLS en la tabla horarios
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

-- Crear políticas para la tabla horarios
CREATE POLICY "Usuarios autenticados pueden ver horarios" 
  ON public.horarios 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear horarios" 
  ON public.horarios 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar horarios" 
  ON public.horarios 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar horarios" 
  ON public.horarios 
  FOR DELETE 
  USING (public.is_admin());

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_horarios_estado ON public.horarios (estado);
CREATE INDEX IF NOT EXISTS idx_horarios_clinic ON public.horarios (clinic_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_horarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_horarios_updated_at_trigger
  BEFORE UPDATE ON public.horarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_horarios_updated_at();
