
-- Crear tabla para los horarios de especialistas
CREATE TABLE IF NOT EXISTS public.specialist_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialist_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 1=Lunes, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  consulting_room_id UUID,
  is_active BOOLEAN DEFAULT true,
  shift_name TEXT, -- 'mañana', 'tarde', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Función para verificar disponibilidad de especialista
CREATE OR REPLACE FUNCTION public.check_specialist_availability(
  p_specialist_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_consulting_room_id UUID DEFAULT NULL
) RETURNS TABLE(
  is_available BOOLEAN,
  conflict_reason TEXT,
  available_slots JSONB
) LANGUAGE plpgsql AS $$
DECLARE
  day_of_week_num INTEGER;
  schedule_exists BOOLEAN := false;
  time_conflict BOOLEAN := false;
  room_conflict BOOLEAN := false;
BEGIN
  -- Obtener día de la semana (0=Domingo, 1=Lunes, etc.)
  day_of_week_num := EXTRACT(DOW FROM p_appointment_date);
  
  -- Verificar si el especialista tiene horario para este día
  SELECT EXISTS(
    SELECT 1 FROM public.specialist_schedules ss
    WHERE ss.specialist_id = p_specialist_id 
    AND ss.day_of_week = day_of_week_num
    AND ss.is_active = true
    AND p_start_time >= ss.start_time 
    AND p_end_time <= ss.end_time
    AND (p_consulting_room_id IS NULL OR ss.consulting_room_id = p_consulting_room_id)
  ) INTO schedule_exists;
  
  -- Si no hay horario disponible
  IF NOT schedule_exists THEN
    RETURN QUERY SELECT 
      false as is_available,
      'El especialista no tiene horario disponible para este día y hora' as conflict_reason,
      '[]'::JSONB as available_slots;
    RETURN;
  END IF;
  
  -- Verificar conflictos de citas existentes
  SELECT EXISTS(
    SELECT 1 FROM public.appointments a
    WHERE a.specialist_id = p_specialist_id
    AND a.appointment_date = p_appointment_date
    AND a.status NOT IN ('Cancelada', 'No Asistió')
    AND (
      (p_start_time >= a.appointment_time AND p_start_time < (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
      OR
      (p_end_time > a.appointment_time AND p_end_time <= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
      OR
      (p_start_time <= a.appointment_time AND p_end_time >= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
    )
  ) INTO time_conflict;
  
  -- Verificar conflictos de consultorio si se especifica
  IF p_consulting_room_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.appointments a
      WHERE a.consulting_room_id = p_consulting_room_id
      AND a.appointment_date = p_appointment_date
      AND a.status NOT IN ('Cancelada', 'No Asistió')
      AND (
        (p_start_time >= a.appointment_time AND p_start_time < (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
        OR
        (p_end_time > a.appointment_time AND p_end_time <= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
        OR
        (p_start_time <= a.appointment_time AND p_end_time >= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
      )
    ) INTO room_conflict;
  END IF;
  
  -- Devolver resultado
  IF time_conflict THEN
    RETURN QUERY SELECT 
      false as is_available,
      'Ya existe una cita programada para este especialista en este horario' as conflict_reason,
      '[]'::JSONB as available_slots;
  ELSIF room_conflict THEN
    RETURN QUERY SELECT 
      false as is_available,
      'El consultorio ya está ocupado en este horario' as conflict_reason,
      '[]'::JSONB as available_slots;
  ELSE
    RETURN QUERY SELECT 
      true as is_available,
      'Horario disponible' as conflict_reason,
      '[]'::JSONB as available_slots;
  END IF;
END;
$$;

-- Función para obtener estadísticas del dashboard de citas por especialista
CREATE OR REPLACE FUNCTION public.get_today_appointments_stats()
RETURNS TABLE(
  specialist_id UUID,
  specialist_name TEXT,
  specialist_color TEXT,
  total_today INTEGER,
  completed_today INTEGER,
  pending_today INTEGER,
  scheduled_today INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as specialist_id,
    (s.first_name || ' ' || s.last_name) as specialist_name,
    COALESCE(s.color, '#5c1c8c') as specialist_color,
    COUNT(a.id)::INTEGER as total_today,
    COUNT(CASE WHEN a.status = 'Completada' THEN 1 END)::INTEGER as completed_today,
    COUNT(CASE WHEN a.status IN ('Programada', 'En Proceso') THEN 1 END)::INTEGER as pending_today,
    COUNT(CASE WHEN a.status = 'Programada' THEN 1 END)::INTEGER as scheduled_today
  FROM public.specialists s
  LEFT JOIN public.appointments a ON s.id = a.specialist_id 
    AND a.appointment_date = CURRENT_DATE
    AND a.status NOT IN ('Cancelada', 'No Asistió')
  WHERE s.status = 'Activo'
  GROUP BY s.id, s.first_name, s.last_name, s.color
  ORDER BY specialist_name;
END;
$$;

-- Insertar algunos horarios de ejemplo para testing
INSERT INTO public.specialist_schedules (specialist_id, day_of_week, start_time, end_time, shift_name, consulting_room_id)
SELECT 
  s.id,
  1, -- Lunes
  '09:00:00'::TIME,
  '13:00:00'::TIME,
  'Mañana',
  (SELECT id FROM public.consulting_rooms LIMIT 1)
FROM public.specialists s
WHERE s.status = 'Activo'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.specialist_schedules (specialist_id, day_of_week, start_time, end_time, shift_name, consulting_room_id)
SELECT 
  s.id,
  1, -- Lunes
  '15:00:00'::TIME,
  '19:00:00'::TIME,
  'Tarde',
  (SELECT id FROM public.consulting_rooms LIMIT 1)
FROM public.specialists s
WHERE s.status = 'Activo'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.specialist_schedules ENABLE ROW LEVEL SECURITY;

-- Crear política para specialist_schedules
CREATE POLICY "Allow all operations on specialist_schedules" ON public.specialist_schedules
FOR ALL USING (true);
