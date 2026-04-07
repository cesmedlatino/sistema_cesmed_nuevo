-- Eliminar todas las versiones de la función
DROP FUNCTION IF EXISTS public.check_specialist_availability(uuid, date, time without time zone, time without time zone, uuid, uuid);
DROP FUNCTION IF EXISTS public.check_specialist_availability(uuid, date, time without time zone, time without time zone, uuid);

-- Recrear con el nuevo parámetro
CREATE FUNCTION public.check_specialist_availability(
  p_specialist_id uuid,
  p_appointment_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_consulting_room_id uuid DEFAULT NULL,
  p_appointment_id uuid DEFAULT NULL
)
RETURNS TABLE(is_available boolean, conflict_reason text, available_slots jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  day_of_week_num INTEGER;
  schedule_exists BOOLEAN := false;
  time_conflict BOOLEAN := false;
  room_conflict BOOLEAN := false;
BEGIN
  day_of_week_num := EXTRACT(DOW FROM p_appointment_date);
  
  -- Verificar horario del especialista
  SELECT EXISTS(
    SELECT 1 FROM public.horario_turno_assignments hta
    JOIN public.horarios h ON hta.horario_id = h.id
    JOIN public.turnos t ON hta.turno_id = t.id
    WHERE h.specialist_id = p_specialist_id
      AND hta.day_of_week = day_of_week_num
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
  
  IF NOT schedule_exists THEN
    RETURN QUERY SELECT 
      false,
      'El especialista no tiene horario disponible para este día y hora'::text,
      '[]'::jsonb;
    RETURN;
  END IF;
  
  -- Verificar conflictos con otras citas (EXCLUYENDO la cita actual cuando se está editando)
  SELECT EXISTS(
    SELECT 1 FROM public.appointments a
    WHERE a.specialist_id = p_specialist_id
      AND a.appointment_date = p_appointment_date
      AND a.status NOT IN ('Cancelada', 'No Asistió')
      AND (p_appointment_id IS NULL OR a.id != p_appointment_id)  -- CLAVE: excluir la cita actual
      AND (
        (p_start_time >= a.appointment_time AND p_start_time < (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
        OR
        (p_end_time > a.appointment_time AND p_end_time <= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
        OR
        (p_start_time <= a.appointment_time AND p_end_time >= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)::TIME)
      )
  ) INTO time_conflict;
  
  -- Verificar conflictos de consultorio (también excluyendo la cita actual)
  IF p_consulting_room_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.appointments a
      WHERE a.consulting_room_id = p_consulting_room_id
        AND a.appointment_date = p_appointment_date
        AND a.status NOT IN ('Cancelada', 'No Asistió')
        AND (p_appointment_id IS NULL OR a.id != p_appointment_id)  -- CLAVE: excluir la cita actual
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
      false,
      'Ya existe una cita programada para este especialista en este horario'::text,
      '[]'::jsonb;
  ELSIF room_conflict THEN
    RETURN QUERY SELECT 
      false,
      'El consultorio ya está ocupado en este horario'::text,
      '[]'::jsonb;
  ELSE
    RETURN QUERY SELECT 
      true,
      'Horario disponible'::text,
      '[]'::jsonb;
  END IF;
END;
$$;