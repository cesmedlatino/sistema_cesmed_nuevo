-- Confirmar el email del usuario omeza.cesmed@gmail.com
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'omeza.cesmed@gmail.com' AND email_confirmed_at IS NULL;

-- Verificar que también exista en la tabla usuario y esté activo
UPDATE public.usuario 
SET activo = true 
WHERE email = 'omeza.cesmed@gmail.com';