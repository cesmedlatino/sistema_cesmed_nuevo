-- 1. Primero eliminar el trigger problemático que está causando conflictos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Limpiar políticas RLS duplicadas en tabla personal
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.personal;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.personal;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.personal;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.personal;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.personal;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar personal" ON public.personal;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear personal" ON public.personal;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar personal" ON public.personal;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver personal" ON public.personal;

-- 3. Limpiar políticas RLS duplicadas en tabla usuario
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.usuario;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.usuario;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.usuario;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.usuario;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.usuario;

-- 4. Crear políticas RLS más específicas y correctas para personal
CREATE POLICY "personal_select" ON public.personal
FOR SELECT TO authenticated
USING (
  is_admin_by_role() OR 
  EXISTS (
    SELECT 1 FROM public.usuario u 
    WHERE u.personal_id = personal.id AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "personal_insert" ON public.personal
FOR INSERT TO authenticated
WITH CHECK (is_admin_by_role());

CREATE POLICY "personal_update" ON public.personal
FOR UPDATE TO authenticated
USING (
  is_admin_by_role() OR 
  EXISTS (
    SELECT 1 FROM public.usuario u 
    WHERE u.personal_id = personal.id AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  is_admin_by_role() OR 
  EXISTS (
    SELECT 1 FROM public.usuario u 
    WHERE u.personal_id = personal.id AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "personal_delete" ON public.personal
FOR DELETE TO authenticated
USING (is_admin_by_role());

-- 5. Crear políticas RLS más específicas y correctas para usuario
CREATE POLICY "usuario_select" ON public.usuario
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR is_admin_by_role());

CREATE POLICY "usuario_insert" ON public.usuario
FOR INSERT TO authenticated
WITH CHECK (is_admin_by_role());

CREATE POLICY "usuario_update" ON public.usuario
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid() OR is_admin_by_role())
WITH CHECK (auth_user_id = auth.uid() OR is_admin_by_role());

CREATE POLICY "usuario_delete" ON public.usuario
FOR DELETE TO authenticated
USING (is_admin_by_role());

-- 6. Limpiar registros de personal duplicados con documento modificado
DELETE FROM public.personal 
WHERE documento_identidad LIKE '%-USER-%';

-- 7. Limpiar usuarios huérfanos que apuntan a personal eliminado
DELETE FROM public.usuario 
WHERE personal_id NOT IN (SELECT id FROM public.personal);

-- 8. Crear función mejorada para crear usuarios completos
CREATE OR REPLACE FUNCTION public.crear_usuario_sistema(
  p_personal_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_rol TEXT DEFAULT 'asistente'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_usuario_id UUID;
  v_personal_record RECORD;
BEGIN
  -- Verificar que el personal existe
  SELECT * INTO v_personal_record FROM public.personal WHERE id = p_personal_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Personal no encontrado');
  END IF;

  -- Verificar que el email no existe
  IF EXISTS (SELECT 1 FROM public.usuario WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'El email ya está registrado');
  END IF;

  -- Verificar que el personal no tiene usuario
  IF EXISTS (SELECT 1 FROM public.usuario WHERE personal_id = p_personal_id) THEN
    RETURN json_build_object('success', false, 'error', 'Este personal ya tiene un usuario asignado');
  END IF;

  -- Crear usuario en Auth (esto debe hacerse desde el cliente)
  -- Aquí solo validamos y devolvemos la información para crear el usuario
  
  RETURN json_build_object(
    'success', true,
    'personal_id', p_personal_id,
    'email', p_email,
    'rol', p_rol,
    'personal_data', json_build_object(
      'nombres', v_personal_record.nombres,
      'apellidos', v_personal_record.apellidos,
      'documento_identidad', v_personal_record.documento_identidad,
      'cargo', v_personal_record.cargo
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;