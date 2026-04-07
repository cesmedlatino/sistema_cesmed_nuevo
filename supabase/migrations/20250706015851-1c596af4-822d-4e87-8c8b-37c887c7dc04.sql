
-- Eliminar las tablas innecesarias para gestión de usuarios
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Eliminar la vista user_details
DROP VIEW IF EXISTS user_details CASCADE;

-- Modificar la tabla usuario para eliminar la dependencia de roles
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_role_id_fkey;
ALTER TABLE usuario DROP COLUMN IF EXISTS role_id;

-- Asegurar que la tabla usuario tenga la estructura correcta
ALTER TABLE usuario ALTER COLUMN rol SET DEFAULT 'asistente';

-- Actualizar funciones de administrador para usar solo el campo 'rol'
CREATE OR REPLACE FUNCTION public.is_admin_by_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.auth_user_id = auth.uid() 
    AND u.rol = 'administrador'
    AND u.activo = true
  );
$$;

-- Actualizar función is_admin_user para usar is_admin_by_role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin_by_role();
$$;

-- Eliminar funciones que dependían de la tabla roles
DROP FUNCTION IF EXISTS public.crear_usuario_con_rol(text, text, text, date, text, text, text, text, text);

-- Actualizar las políticas RLS de la tabla usuario
DROP POLICY IF EXISTS usuario_delete_policy ON usuario;
DROP POLICY IF EXISTS usuario_insert_policy ON usuario;
DROP POLICY IF EXISTS usuario_select_policy ON usuario;
DROP POLICY IF EXISTS usuario_update_policy ON usuario;

-- Recrear políticas RLS simplificadas para usuario
CREATE POLICY "usuario_delete_policy" 
ON usuario FOR DELETE 
USING (is_admin_by_role());

CREATE POLICY "usuario_insert_policy" 
ON usuario FOR INSERT 
WITH CHECK (is_admin_by_role() OR current_setting('role') = 'service_role');

CREATE POLICY "usuario_select_policy" 
ON usuario FOR SELECT 
USING (auth_user_id = auth.uid() OR is_admin_by_role());

CREATE POLICY "usuario_update_policy" 
ON usuario FOR UPDATE 
USING (auth_user_id = auth.uid() OR is_admin_by_role());

-- Actualizar políticas de personal para mantener solo la relación con administrador
DROP POLICY IF EXISTS personal_delete_policy ON personal;
DROP POLICY IF EXISTS personal_insert_policy ON personal;
DROP POLICY IF EXISTS personal_select_policy ON personal;
DROP POLICY IF EXISTS personal_update_policy ON personal;

-- Recrear políticas RLS para personal
CREATE POLICY "personal_delete_policy" 
ON personal FOR DELETE 
USING (is_admin_by_role());

CREATE POLICY "personal_insert_policy" 
ON personal FOR INSERT 
WITH CHECK (is_admin_by_role() OR current_setting('role') = 'service_role');

CREATE POLICY "personal_select_policy" 
ON personal FOR SELECT 
USING (is_admin_by_role() OR EXISTS (
  SELECT 1 FROM usuario u 
  WHERE u.personal_id = personal.id 
  AND u.auth_user_id = auth.uid()
));

CREATE POLICY "personal_update_policy" 
ON personal FOR UPDATE 
USING (is_admin_by_role() OR EXISTS (
  SELECT 1 FROM usuario u 
  WHERE u.personal_id = personal.id 
  AND u.auth_user_id = auth.uid()
));

-- Asegurar que existe un usuario administrador
DO $$
BEGIN
  -- Verificar si existe al menos un administrador
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE rol = 'administrador' AND activo = true) THEN
    -- Si no existe, actualizar el primer usuario activo como administrador
    UPDATE usuario 
    SET rol = 'administrador' 
    WHERE activo = true 
    AND id = (SELECT id FROM usuario WHERE activo = true LIMIT 1);
  END IF;
END $$;
