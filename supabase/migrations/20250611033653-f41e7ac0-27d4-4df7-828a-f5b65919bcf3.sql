
-- Verificar y crear políticas RLS para la tabla appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas para appointments
CREATE POLICY "Users can view appointments" ON public.appointments
  FOR SELECT USING (true);

CREATE POLICY "Users can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update appointments" ON public.appointments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete appointments" ON public.appointments
  FOR DELETE USING (true);

-- Agregar campo de color a la tabla specialists si no existe
ALTER TABLE public.specialists 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#5c1c8c';

-- Actualizar colores por especialidad existentes
UPDATE public.specialists 
SET color = CASE 
  WHEN EXISTS (
    SELECT 1 FROM public.medical_specialties ms 
    WHERE ms.id = specialists.specialty_id 
    AND ms.name ILIKE '%oftalmolog%'
  ) THEN '#22c55e'  -- Verde para oftalmología
  WHEN EXISTS (
    SELECT 1 FROM public.medical_specialties ms 
    WHERE ms.id = specialists.specialty_id 
    AND ms.name ILIKE '%dermatolog%'
  ) THEN '#8b5cf6'  -- Lila para dermatología
  ELSE '#5c1c8c'    -- Morado por defecto
END
WHERE color = '#5c1c8c' OR color IS NULL;

-- Función para obtener disponibilidad de citas mejorada
CREATE OR REPLACE FUNCTION public.get_calendar_appointments(
  p_start_date DATE,
  p_end_date DATE,
  p_specialist_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  specialist_name TEXT,
  specialist_color TEXT,
  patient_name TEXT,
  status TEXT,
  reason TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    COALESCE(a.reason, 'Consulta Médica') as title,
    (a.appointment_date + a.appointment_time)::TIMESTAMP WITH TIME ZONE as start_time,
    (a.appointment_date + a.appointment_time + INTERVAL '30 minutes')::TIMESTAMP WITH TIME ZONE as end_time,
    COALESCE(s.first_name || ' ' || s.last_name, 'Especialista') as specialist_name,
    COALESCE(s.color, '#5c1c8c') as specialist_color,
    COALESCE(p.first_name || ' ' || p.last_name, 'Paciente') as patient_name,
    COALESCE(a.status, 'Programada') as status,
    a.reason
  FROM public.appointments a
  LEFT JOIN public.specialists s ON a.specialist_id = s.id
  LEFT JOIN public.patients p ON a.patient_id = p.id
  WHERE a.appointment_date BETWEEN p_start_date AND p_end_date
    AND (p_specialist_id IS NULL OR a.specialist_id = p_specialist_id)
    AND a.status NOT IN ('Cancelada', 'No Asistió')
  ORDER BY a.appointment_date, a.appointment_time;
END;
$$;
