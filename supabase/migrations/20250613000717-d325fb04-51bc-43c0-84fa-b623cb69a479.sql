
-- Eliminar la tabla specialist_schedules ya que no se debe usar
DROP TABLE IF EXISTS public.specialist_schedules CASCADE;

-- Actualizar la función check_specialist_availability para usar horario_turno_assignments
CREATE OR REPLACE FUNCTION public.check_specialist_availability(
  p_specialist_id uuid, 
  p_appointment_date date, 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_consulting_room_id uuid DEFAULT NULL::uuid
) 
RETURNS TABLE(is_available boolean, conflict_reason text, available_slots jsonb)
LANGUAGE plpgsql
AS $function$
DECLARE
  day_of_week_num INTEGER;
  schedule_exists BOOLEAN := false;
  time_conflict BOOLEAN := false;
  room_conflict BOOLEAN := false;
BEGIN
  -- Obtener día de la semana (0=Domingo, 1=Lunes, etc.)
  day_of_week_num := EXTRACT(DOW FROM p_appointment_date);
  
  -- Verificar si el especialista tiene horario para este día usando horario_turno_assignments
  -- Necesitamos hacer join con horarios y turnos para obtener los horarios del especialista
  SELECT EXISTS(
    SELECT 1 FROM public.horario_turno_assignments hta
    JOIN public.horarios h ON hta.horario_id = h.id
    JOIN public.turnos t ON hta.turno_id = t.id
    JOIN public.specialists s ON s.id = p_specialist_id
    WHERE hta.day_of_week = day_of_week_num
    AND hta.is_active = true
    AND h.estado = 'activo'
    AND (
      (hta.custom_start_time IS NOT NULL AND hta.custom_end_time IS NOT NULL AND
       p_start_time >= hta.custom_start_time AND p_end_time <= hta.custom_end_time)
      OR
      (hta.custom_start_time IS NULL AND hta.custom_end_time IS NULL AND
       p_start_time >= t.start_time AND p_end_time <= t.end_time)
    )
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
$function$;

-- Crear función para obtener horarios de especialista desde horario_turno_assignments
CREATE OR REPLACE FUNCTION public.get_specialist_schedules_from_assignments(p_specialist_id uuid)
RETURNS TABLE(
  day_of_week integer,
  start_time time without time zone,
  end_time time without time zone,
  shift_name text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    hta.day_of_week,
    COALESCE(hta.custom_start_time, t.start_time) as start_time,
    COALESCE(hta.custom_end_time, t.end_time) as end_time,
    t.name as shift_name
  FROM public.horario_turno_assignments hta
  JOIN public.horarios h ON hta.horario_id = h.id
  JOIN public.turnos t ON hta.turno_id = t.id
  JOIN public.specialists s ON s.id = p_specialist_id
  WHERE hta.is_active = true
  AND h.estado = 'activo'
  ORDER BY hta.day_of_week, start_time;
END;
$function$;
