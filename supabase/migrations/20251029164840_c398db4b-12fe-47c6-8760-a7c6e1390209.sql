-- Eliminar la función existente
DROP FUNCTION IF EXISTS public.update_user_menu_config(uuid, jsonb);

-- Crear la nueva función que use auth_user_id
CREATE OR REPLACE FUNCTION public.update_user_menu_config(user_auth_id uuid, new_menu_config jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar que el usuario actual es administrador
  IF NOT public.is_admin_by_role() THEN
    RETURN json_build_object('success', false, 'error', 'Solo los administradores pueden modificar configuraciones de menú');
  END IF;

  -- Actualizar la configuración de menú usando auth_user_id
  UPDATE public.usuario
  SET menu_config = new_menu_config
  WHERE auth_user_id = user_auth_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Configuración de menú actualizada correctamente');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;