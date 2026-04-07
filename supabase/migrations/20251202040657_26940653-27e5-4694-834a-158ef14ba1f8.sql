-- Modificar la función check_specialist_availability para excluir la cita actual cuando se está editando
CREATE OR REPLACE FUNCTION check_specialist_availability(
  p_specialist_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_consulting_room_id UUID DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL  -- Nuevo parámetro para excluir la cita actual
)
RETURNS TABLE (
  is_available BOOLEAN,
  conflict_reason TEXT,
  available_slots JSON
) AS $$
DECLARE
  v_conflicting_appointments INT;
  v_specialist_schedule_exists BOOLEAN;
BEGIN
  -- Verificar si el especialista tiene horario programado para ese día
  SELECT EXISTS (
    SELECT 1
    FROM specialist_shifts ss
    WHERE ss.specialist_id = p_specialist_id
      AND ss.is_active = true
      AND ss.day_of_week = EXTRACT(DOW FROM p_appointment_date)::INTEGER
      AND p_start_time >= ss.start_time
      AND p_end_time <= ss.end_time
  ) INTO v_specialist_schedule_exists;

  -- Si no hay horario, no está disponible
  IF NOT v_specialist_schedule_exists THEN
    RETURN QUERY SELECT 
      false,
      'El especialista no tiene horario disponible para este día y hora'::TEXT,
      NULL::JSON;
    RETURN;
  END IF;

  -- Verificar conflictos con otras citas (excluyendo la cita actual si se está editando)
  SELECT COUNT(*)
  INTO v_conflicting_appointments
  FROM appointments a
  WHERE a.specialist_id = p_specialist_id
    AND a.appointment_date = p_appointment_date
    AND a.status NOT IN ('Cancelada', 'No asistió')
    AND (a.id != p_appointment_id OR p_appointment_id IS NULL)  -- Excluir la cita actual
    AND (
      -- Verificar si hay solapamiento de horarios
      (p_start_time >= a.appointment_time 
       AND p_start_time < (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL))
      OR
      (p_end_time > a.appointment_time 
       AND p_end_time <= (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL))
      OR
      (p_start_time <= a.appointment_time 
       AND p_end_time >= (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL))
    );

  -- Si hay conflictos, no está disponible
  IF v_conflicting_appointments > 0 THEN
    RETURN QUERY SELECT 
      false,
      'Ya existe una cita programada para este especialista en este horario'::TEXT,
      NULL::JSON;
    RETURN;
  END IF;

  -- Verificar conflictos de consultorio si se especifica
  IF p_consulting_room_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_conflicting_appointments
    FROM appointments a
    WHERE a.consulting_room_id = p_consulting_room_id
      AND a.appointment_date = p_appointment_date
      AND a.status NOT IN ('Cancelada', 'No asistió')
      AND (a.id != p_appointment_id OR p_appointment_id IS NULL)  -- Excluir la cita actual
      AND (
        -- Verificar si hay solapamiento de horarios
        (p_start_time >= a.appointment_time 
         AND p_start_time < (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL))
        OR
        (p_end_time > a.appointment_time 
         AND p_end_time <= (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL))
        OR
        (p_start_time <= a.appointment_time 
         AND p_end_time >= (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL))
      );

    IF v_conflicting_appointments > 0 THEN
      RETURN QUERY SELECT 
        false,
        'El consultorio ya está ocupado en este horario'::TEXT,
        NULL::JSON;
      RETURN;
    END IF;
  END IF;

  -- Si pasó todas las verificaciones, está disponible
  RETURN QUERY SELECT 
    true,
    'Horario disponible'::TEXT,
    NULL::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;