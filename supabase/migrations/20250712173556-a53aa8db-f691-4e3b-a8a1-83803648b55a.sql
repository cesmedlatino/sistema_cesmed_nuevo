-- Eliminar las políticas nuevas que se duplicaron con las existentes
DROP POLICY IF EXISTS "personal_select" ON public.personal;
DROP POLICY IF EXISTS "personal_insert" ON public.personal;
DROP POLICY IF EXISTS "personal_update" ON public.personal;
DROP POLICY IF EXISTS "personal_delete" ON public.personal;

DROP POLICY IF EXISTS "usuario_select" ON public.usuario;
DROP POLICY IF EXISTS "usuario_insert" ON public.usuario;
DROP POLICY IF EXISTS "usuario_update" ON public.usuario;
DROP POLICY IF EXISTS "usuario_delete" ON public.usuario;

-- Las políticas existentes con "_policy" en el nombre ya funcionan correctamente
-- Verificar que las funciones necesarias existen y funcionan
SELECT proname FROM pg_proc WHERE proname = 'crear_usuario_sistema';