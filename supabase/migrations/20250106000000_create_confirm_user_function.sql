
-- Función para confirmar automáticamente el email de un usuario
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Esta función confirma automáticamente el email de un usuario
  -- Solo debe ser usada para usuarios creados sin verificación de email
  
  UPDATE auth.users 
  SET 
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = user_id 
    AND email_confirmed_at IS NULL;
    
EXCEPTION
  WHEN others THEN
    -- Si hay algún error, lo registramos pero no lo propagamos
    -- ya que es una operación opcional
    RAISE NOTICE 'Error confirmando email para usuario %: %', user_id, SQLERRM;
END;
$$;

-- Otorgar permisos para que los usuarios autenticados puedan usar esta función
GRANT EXECUTE ON FUNCTION public.confirm_user_email(uuid) TO authenticated;
