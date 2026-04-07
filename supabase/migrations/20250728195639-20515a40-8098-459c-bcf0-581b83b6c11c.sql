-- Crear función para obtener solo horarios activos del especialista con sus turnos asignados
CREATE OR REPLACE FUNCTION public.get_active_specialist_schedule(p_specialist_id uuid)
RETURNS TABLE(
    day_of_week integer, 
    start_time time without time zone, 
    end_time time without time zone, 
    shift_name text,
    horario_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hta.day_of_week,
    COALESCE(hta.custom_start_time, t.start_time) as start_time,
    COALESCE(hta.custom_end_time, t.end_time) as end_time,
    t.name as shift_name,
    h.nombre as horario_name
  FROM public.horario_turno_assignments hta
  JOIN public.horarios h ON hta.horario_id = h.id
  JOIN public.turnos t ON hta.turno_id = t.id
  WHERE h.specialist_id = p_specialist_id
  AND h.estado = 'activo'
  AND hta.is_active = true
  ORDER BY hta.day_of_week, start_time;
END;
$$;