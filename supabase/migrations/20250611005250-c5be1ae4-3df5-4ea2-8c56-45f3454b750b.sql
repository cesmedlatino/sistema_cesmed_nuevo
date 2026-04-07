
-- Crear tabla para tipos de turno
CREATE TABLE public.shift_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar tipos de turno predefinidos
INSERT INTO public.shift_types (name, description) VALUES 
('semanal', 'Turno con horario fijo para todos los días de la semana'),
('personalizado', 'Turno con horario variable para cada día');

-- Crear tabla para turnos (ya que no existe)
CREATE TABLE public.turnos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  shift_type_id UUID REFERENCES public.shift_types(id),
  start_time TIME,
  end_time TIME,
  is_custom BOOLEAN DEFAULT false,
  clinic_id UUID REFERENCES public.clinics(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Crear tabla para asignación de turnos a horarios por día
CREATE TABLE public.horario_turno_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horario_id UUID NOT NULL REFERENCES public.horarios(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Domingo, 1=Lunes, etc.
  custom_start_time TIME,
  custom_end_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(horario_id, day_of_week)
);

-- Crear función para actualizar updated_at automáticamente en turnos
CREATE OR REPLACE FUNCTION update_turnos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at en turnos
CREATE TRIGGER update_turnos_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW
  EXECUTE FUNCTION update_turnos_updated_at();

-- Crear función para actualizar updated_at automáticamente en assignments
CREATE OR REPLACE FUNCTION update_horario_turno_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at en assignments
CREATE TRIGGER update_horario_turno_assignments_updated_at
  BEFORE UPDATE ON public.horario_turno_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_horario_turno_assignments_updated_at();

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horario_turno_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shift_types (solo lectura para todos los usuarios autenticados)
CREATE POLICY "Users can view shift types" ON public.shift_types
  FOR SELECT USING (true);

-- Políticas RLS para turnos
CREATE POLICY "Users can view turnos" ON public.turnos
  FOR SELECT USING (true);

CREATE POLICY "Users can create turnos" ON public.turnos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update turnos" ON public.turnos
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete turnos" ON public.turnos
  FOR DELETE USING (true);

-- Políticas RLS para horario_turno_assignments
CREATE POLICY "Users can view horario turno assignments" ON public.horario_turno_assignments
  FOR SELECT USING (true);

CREATE POLICY "Users can create horario turno assignments" ON public.horario_turno_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update horario turno assignments" ON public.horario_turno_assignments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete horario turno assignments" ON public.horario_turno_assignments
  FOR DELETE USING (true);
