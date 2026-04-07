-- Función para validar que los turnos estén dentro de los horarios de atención de la clínica
CREATE OR REPLACE FUNCTION validate_turno_against_clinic_hours(
  p_start_time TIME,
  p_end_time TIME,
  p_clinic_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  clinic_opening TIME;
  clinic_closing TIME;
BEGIN
  -- Obtener horarios de la clínica (asumiendo que es el mismo para todos los días por ahora)
  SELECT MIN(opening_time), MAX(closing_time) 
  INTO clinic_opening, clinic_closing
  FROM opening_hours 
  WHERE clinic_id IS NOT NULL 
  AND is_open = true;
  
  -- Si no hay horarios definidos, permitir cualquier horario
  IF clinic_opening IS NULL OR clinic_closing IS NULL THEN
    RETURN true;
  END IF;
  
  -- Validar que el turno esté dentro del horario de la clínica
  RETURN p_start_time >= clinic_opening AND p_end_time <= clinic_closing;
END;
$$ LANGUAGE plpgsql;

-- Función para validar que los horarios de especialistas estén dentro de los turnos
CREATE OR REPLACE FUNCTION validate_specialist_schedule_against_turnos(
  p_day_of_week INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_turno_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  turno_start TIME;
  turno_end TIME;
  clinic_opening TIME;
  clinic_closing TIME;
BEGIN
  -- Obtener horarios del turno
  SELECT start_time, end_time 
  INTO turno_start, turno_end
  FROM turnos 
  WHERE id = p_turno_id;
  
  -- Obtener horarios de la clínica para el día específico
  SELECT opening_time, closing_time 
  INTO clinic_opening, clinic_closing
  FROM opening_hours 
  WHERE day_of_week = p_day_of_week 
  AND clinic_id IS NOT NULL 
  AND is_open = true;
  
  -- Validar que esté dentro del turno Y dentro del horario de la clínica
  RETURN (p_start_time >= COALESCE(turno_start, p_start_time) AND 
          p_end_time <= COALESCE(turno_end, p_end_time)) AND
         (p_start_time >= COALESCE(clinic_opening, p_start_time) AND 
          p_end_time <= COALESCE(clinic_closing, p_end_time));
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar turnos antes de insertar/actualizar
CREATE OR REPLACE FUNCTION validate_turno_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo validar si tiene horarios definidos (no es custom)
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    IF NOT validate_turno_against_clinic_hours(NEW.start_time, NEW.end_time, NEW.clinic_id) THEN
      RAISE EXCEPTION 'El turno debe estar dentro de los horarios de atención de la clínica';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar horarios de especialistas
CREATE OR REPLACE FUNCTION validate_specialist_schedule_hours()
RETURNS TRIGGER AS $$
DECLARE
  turno_id UUID;
BEGIN
  -- Obtener el turno_id del assignment
  turno_id := NEW.turno_id;
  
  -- Solo validar si tiene horarios personalizados
  IF NEW.custom_start_time IS NOT NULL AND NEW.custom_end_time IS NOT NULL THEN
    IF NOT validate_specialist_schedule_against_turnos(
      NEW.day_of_week, 
      NEW.custom_start_time, 
      NEW.custom_end_time, 
      turno_id
    ) THEN
      RAISE EXCEPTION 'El horario del especialista debe estar dentro del turno asignado y los horarios de la clínica';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS validate_turno_hours_trigger ON turnos;
CREATE TRIGGER validate_turno_hours_trigger
  BEFORE INSERT OR UPDATE ON turnos
  FOR EACH ROW
  EXECUTE FUNCTION validate_turno_hours();

DROP TRIGGER IF EXISTS validate_specialist_schedule_trigger ON horario_turno_assignments;
CREATE TRIGGER validate_specialist_schedule_trigger
  BEFORE INSERT OR UPDATE ON horario_turno_assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_specialist_schedule_hours();