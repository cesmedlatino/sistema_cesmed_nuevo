-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS public.search_patients(text);

-- Recrear con el campo hms incluido
CREATE OR REPLACE FUNCTION public.search_patients(search_term text)
 RETURNS TABLE(id uuid, patient_code text, first_name text, last_name text, dni text, birth_date date, gender text, phone text, email text, hms text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.patient_code,
    p.first_name,
    p.last_name,
    p.dni,
    p.birth_date,
    p.gender,
    p.phone,
    p.email,
    p.hms
  FROM public.patients p
  WHERE 
    p.first_name ILIKE '%' || search_term || '%' OR
    p.last_name ILIKE '%' || search_term || '%' OR
    p.dni ILIKE '%' || search_term || '%' OR
    p.hms ILIKE '%' || search_term || '%' OR
    (p.first_name || ' ' || p.last_name) ILIKE '%' || search_term || '%'
  ORDER BY p.last_name, p.first_name
  LIMIT 20;
END;
$function$;