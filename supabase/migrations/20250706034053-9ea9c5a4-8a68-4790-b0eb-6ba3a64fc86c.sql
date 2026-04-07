
-- Crear función para sincronizar usuarios existentes de auth con la tabla usuario
CREATE OR REPLACE FUNCTION sync_auth_users_to_usuario()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user RECORD;
    existing_personal_id UUID;
BEGIN
    -- Iterar sobre todos los usuarios de auth que no están en la tabla usuario
    FOR auth_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.usuario u ON au.id = u.auth_user_id
        WHERE u.id IS NULL
        AND au.email IS NOT NULL
    LOOP
        -- Buscar si ya existe personal con el mismo email
        SELECT id INTO existing_personal_id
        FROM public.personal
        WHERE documento_identidad = COALESCE(auth_user.raw_user_meta_data ->> 'documento_identidad', 'DOC-' || extract(epoch from now())::text)
        LIMIT 1;
        
        -- Si no existe el personal, crearlo
        IF existing_personal_id IS NULL THEN
            INSERT INTO public.personal (
                nombres,
                apellidos,
                documento_identidad,
                fecha_nacimiento,
                sexo,
                cargo,
                fecha_ingreso,
                estado
            ) VALUES (
                COALESCE(auth_user.raw_user_meta_data ->> 'nombres', 'Usuario'),
                COALESCE(auth_user.raw_user_meta_data ->> 'apellidos', 'Sincronizado'),
                COALESCE(auth_user.raw_user_meta_data ->> 'documento_identidad', 'DOC-' || extract(epoch from now())::text),
                COALESCE((auth_user.raw_user_meta_data ->> 'fecha_nacimiento')::date, '1990-01-01'::date),
                COALESCE(auth_user.raw_user_meta_data ->> 'sexo', 'M'),
                COALESCE(auth_user.raw_user_meta_data ->> 'cargo', 'Asistente'),
                CURRENT_DATE,
                'activo'
            ) RETURNING id INTO existing_personal_id;
        END IF;
        
        -- Crear el registro en la tabla usuario
        INSERT INTO public.usuario (
            personal_id,
            email,
            auth_user_id,
            rol,
            activo
        ) VALUES (
            existing_personal_id,
            auth_user.email,
            auth_user.id,
            COALESCE(auth_user.raw_user_meta_data ->> 'rol', 'asistente'),
            true
        );
        
        RAISE NOTICE 'Usuario sincronizado: %', auth_user.email;
    END LOOP;
END;
$$;

-- Ejecutar la sincronización inmediatamente
SELECT sync_auth_users_to_usuario();

-- Actualizar la función handle_new_user para garantizar que siempre se cree el registro en usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_personal_id UUID;
  v_rol TEXT;
  v_specialty_id UUID;
BEGIN
  -- Extraer datos del metadata
  v_rol := COALESCE(NEW.raw_user_meta_data ->> 'rol', 'asistente');

  -- Verificar si ya existe un registro en usuario para este auth_user_id
  IF EXISTS (SELECT 1 FROM public.usuario WHERE auth_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Crear registro en personal
  INSERT INTO public.personal (
    nombres,
    apellidos,
    documento_identidad,
    fecha_nacimiento,
    sexo,
    cargo,
    fecha_ingreso,
    estado
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'nombres', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data ->> 'apellidos', 'Nuevo'),
    COALESCE(NEW.raw_user_meta_data ->> 'documento_identidad', 'DOC-' || extract(epoch from now())::text),
    COALESCE((NEW.raw_user_meta_data ->> 'fecha_nacimiento')::date, '1990-01-01'::date),
    COALESCE(NEW.raw_user_meta_data ->> 'sexo', 'M'),
    COALESCE(NEW.raw_user_meta_data ->> 'cargo', 'Asistente'),
    CURRENT_DATE,
    'activo'
  ) RETURNING id INTO v_personal_id;

  -- Crear registro en la tabla usuario
  INSERT INTO public.usuario (
    personal_id,
    email,
    auth_user_id,
    rol,
    activo
  ) VALUES (
    v_personal_id,
    NEW.email,
    NEW.id,
    v_rol,
    true
  );

  -- Si es especialista, crear registro en specialists
  IF v_rol = 'especialista' THEN
    -- Buscar specialty_id
    SELECT id INTO v_specialty_id 
    FROM public.medical_specialties 
    WHERE name ILIKE COALESCE(NEW.raw_user_meta_data ->> 'especialidad', 'Medicina General')
    LIMIT 1;

    INSERT INTO public.specialists (
      first_name,
      last_name,
      dni,
      license_number,
      professional_title,
      study_summary,
      status,
      specialty_id,
      years_of_experience
    ) VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'nombres', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data ->> 'apellidos', 'Nuevo'),
      COALESCE(NEW.raw_user_meta_data ->> 'documento_identidad', 'DOC-' || extract(epoch from now())::text),
      COALESCE(NEW.raw_user_meta_data ->> 'colegiatura', 'COL-' || extract(epoch from now())::text),
      COALESCE(NEW.raw_user_meta_data ->> 'titulo', 'Médico'),
      COALESCE(NEW.raw_user_meta_data ->> 'especialidad', 'Medicina General'),
      'Activo',
      v_specialty_id,
      0
    );
  END IF;

  RETURN NEW;
END;
$$;
