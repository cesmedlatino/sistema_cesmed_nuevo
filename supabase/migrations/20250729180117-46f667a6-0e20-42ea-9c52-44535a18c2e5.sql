-- Agregar columna para configuración personalizada de menú por usuario
ALTER TABLE public.usuario 
ADD COLUMN menu_config JSONB DEFAULT NULL;

-- Agregar comentario a la columna
COMMENT ON COLUMN public.usuario.menu_config IS 'Configuración personalizada de secciones del menú por usuario. NULL = usar configuración por defecto del rol';

-- Crear función para actualizar configuración de menú de usuario
CREATE OR REPLACE FUNCTION public.update_user_menu_config(
  target_user_id UUID, 
  new_menu_config JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar que el usuario actual es administrador
  IF NOT public.is_admin_by_role() THEN
    RETURN json_build_object('success', false, 'error', 'Solo los administradores pueden modificar configuraciones de menú');
  END IF;

  -- Actualizar la configuración de menú
  UPDATE public.usuario
  SET menu_config = new_menu_config
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Configuración de menú actualizada correctamente');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Crear función para obtener configuración de menú de usuario
CREATE OR REPLACE FUNCTION public.get_user_menu_config(user_auth_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_menu_config JSONB;
  user_role TEXT;
  role_permissions JSONB;
BEGIN
  -- Obtener configuración personalizada de menú y rol del usuario
  SELECT u.menu_config, u.rol INTO user_menu_config, user_role
  FROM public.usuario u
  WHERE u.auth_user_id = user_auth_id;

  -- Si tiene configuración personalizada, devolverla
  IF user_menu_config IS NOT NULL THEN
    RETURN user_menu_config;
  END IF;

  -- Si no tiene configuración personalizada, obtener permisos del rol
  SELECT r.permissions INTO role_permissions
  FROM public.roles r
  WHERE r.name = user_role;

  -- Devolver permisos del rol o configuración por defecto
  RETURN COALESCE(role_permissions, '{"sections": []}'::JSONB);
END;
$$;