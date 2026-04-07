
-- Crear tabla de roles si no existe
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar los roles básicos
INSERT INTO public.roles (name, description, permissions) VALUES
  ('administrador', 'Administrador del sistema', '{"all_access": true}'),
  ('especialista', 'Especialista médico', '{"sections": ["dashboard", "appointments", "medical-records", "prescriptions"]}'),
  ('asistente', 'Asistente médico', '{"sections": ["dashboard", "patients", "medical-records", "appointments", "prescriptions", "specialists", "medical-specialties", "staff", "consulting-rooms", "horarios", "shifts", "opening-hours", "medical-center-config"]}'),
  ('recepcionista', 'Recepcionista', '{"sections": ["dashboard", "patients", "medical-records", "appointments", "prescriptions", "specialists", "medical-specialties", "staff", "consulting-rooms", "horarios", "shifts", "opening-hours", "medical-center-config"]}')
ON CONFLICT (name) DO NOTHING;

-- Habilitar RLS en la tabla roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver los roles
CREATE POLICY "Users can view roles" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

-- Solo administradores pueden modificar roles
CREATE POLICY "Only admins can modify roles" ON public.roles
  FOR ALL TO authenticated
  USING (is_admin_by_role())
  WITH CHECK (is_admin_by_role());

-- Crear función para obtener permisos de usuario
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role TEXT;
  role_permissions JSONB;
BEGIN
  -- Obtener el rol del usuario
  SELECT u.rol INTO user_role
  FROM usuario u
  WHERE u.auth_user_id = user_id;
  
  -- Si no se encuentra el usuario, retornar permisos vacíos
  IF user_role IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;
  
  -- Obtener los permisos del rol
  SELECT r.permissions INTO role_permissions
  FROM roles r
  WHERE r.name = user_role;
  
  -- Si no se encuentran permisos, retornar permisos básicos
  IF role_permissions IS NULL THEN
    RETURN '{"sections": []}'::JSONB;
  END IF;
  
  RETURN role_permissions;
END;
$$;

-- Crear función para verificar si el usuario tiene acceso a una sección
CREATE OR REPLACE FUNCTION user_has_section_access(user_id UUID, section_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  permissions JSONB;
  sections JSONB;
BEGIN
  -- Obtener permisos del usuario
  permissions := get_user_permissions(user_id);
  
  -- Si tiene acceso total, retornar true
  IF (permissions->>'all_access')::BOOLEAN = true THEN
    RETURN true;
  END IF;
  
  -- Verificar si la sección está en la lista de secciones permitidas
  sections := permissions->'sections';
  IF sections IS NOT NULL THEN
    RETURN sections ? section_name;
  END IF;
  
  RETURN false;
END;
$$;
