-- Create expense categories table
CREATE TABLE public.egreso_categorias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Create expense concepts table
CREATE TABLE public.egreso_conceptos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    categoria_id uuid REFERENCES public.egreso_categorias(id) ON DELETE SET NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Create expenses table
CREATE TABLE public.egresos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    concepto_id uuid REFERENCES public.egreso_conceptos(id) ON DELETE SET NULL,
    categoria_id uuid REFERENCES public.egreso_categorias(id) ON DELETE SET NULL,
    monto numeric NOT NULL,
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    hora time without time zone NOT NULL DEFAULT CURRENT_TIME,
    turno text NOT NULL,
    modalidad_id uuid REFERENCES public.modalidad(id) ON DELETE SET NULL,
    descripcion text,
    comprobante_referencia text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Enable RLS
ALTER TABLE public.egreso_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egreso_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for egreso_categorias
CREATE POLICY "Usuarios autenticados pueden ver categorías de egreso"
ON public.egreso_categorias FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear categorías de egreso"
ON public.egreso_categorias FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar categorías de egreso"
ON public.egreso_categorias FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar categorías de egreso"
ON public.egreso_categorias FOR DELETE
USING (is_admin_by_role());

-- RLS Policies for egreso_conceptos
CREATE POLICY "Usuarios autenticados pueden ver conceptos de egreso"
ON public.egreso_conceptos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear conceptos de egreso"
ON public.egreso_conceptos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar conceptos de egreso"
ON public.egreso_conceptos FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar conceptos de egreso"
ON public.egreso_conceptos FOR DELETE
USING (is_admin_by_role());

-- RLS Policies for egresos
CREATE POLICY "Usuarios autenticados pueden ver egresos"
ON public.egresos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear egresos"
ON public.egresos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar egresos"
ON public.egresos FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar egresos"
ON public.egresos FOR DELETE
USING (is_admin_by_role());

-- Create indexes for better performance
CREATE INDEX idx_egresos_fecha ON public.egresos(fecha);
CREATE INDEX idx_egresos_concepto ON public.egresos(concepto_id);
CREATE INDEX idx_egresos_categoria ON public.egresos(categoria_id);
CREATE INDEX idx_egreso_conceptos_categoria ON public.egreso_conceptos(categoria_id);