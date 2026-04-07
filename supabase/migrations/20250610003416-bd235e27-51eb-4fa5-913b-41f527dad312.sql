
-- Primero, habilitar RLS en la tabla patients si no está habilitado
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Crear políticas para la tabla patients
CREATE POLICY "Usuarios autenticados pueden ver pacientes" 
  ON public.patients 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear pacientes" 
  ON public.patients 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar pacientes" 
  ON public.patients 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar pacientes" 
  ON public.patients 
  FOR DELETE 
  USING (public.is_admin());

-- Habilitar RLS en la tabla medical_records si no está habilitado
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Crear políticas para la tabla medical_records
CREATE POLICY "Usuarios autenticados pueden ver historias clínicas" 
  ON public.medical_records 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear historias clínicas" 
  ON public.medical_records 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar historias clínicas" 
  ON public.medical_records 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar historias clínicas" 
  ON public.medical_records 
  FOR DELETE 
  USING (public.is_admin());

-- Agregar columna de estado a medical_records si no existe
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Abierta';

-- Agregar índices para mejorar la búsqueda de pacientes
CREATE INDEX IF NOT EXISTS idx_patients_search ON public.patients USING gin(
  to_tsvector('spanish', first_name || ' ' || last_name || ' ' || dni)
);

CREATE INDEX IF NOT EXISTS idx_patients_dni ON public.patients (dni);
CREATE INDEX IF NOT EXISTS idx_patients_names ON public.patients (first_name, last_name);

-- Agregar índice para historias clínicas por paciente
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records (patient_id, visit_date DESC);

-- Función para buscar pacientes
CREATE OR REPLACE FUNCTION public.search_patients(search_term TEXT)
RETURNS TABLE(
  id UUID,
  patient_code TEXT,
  first_name TEXT,
  last_name TEXT,
  dni TEXT,
  birth_date DATE,
  gender TEXT,
  phone TEXT,
  email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    p.email
  FROM public.patients p
  WHERE 
    p.first_name ILIKE '%' || search_term || '%' OR
    p.last_name ILIKE '%' || search_term || '%' OR
    p.dni ILIKE '%' || search_term || '%' OR
    (p.first_name || ' ' || p.last_name) ILIKE '%' || search_term || '%'
  ORDER BY p.last_name, p.first_name
  LIMIT 20;
END;
$$;

-- Función para obtener historias clínicas de un paciente
CREATE OR REPLACE FUNCTION public.get_patient_medical_records(patient_uuid UUID)
RETURNS TABLE(
  id UUID,
  visit_date DATE,
  chief_complaint TEXT,
  diagnosis TEXT,
  status TEXT,
  specialist_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.id,
    mr.visit_date,
    mr.chief_complaint,
    mr.diagnosis,
    COALESCE(mr.status, 'Abierta') as status,
    COALESCE(s.first_name || ' ' || s.last_name, 'No especificado') as specialist_name,
    mr.created_at
  FROM public.medical_records mr
  LEFT JOIN public.specialists s ON mr.specialist_id = s.id
  WHERE mr.patient_id = patient_uuid
  ORDER BY mr.visit_date DESC, mr.created_at DESC;
END;
$$;
