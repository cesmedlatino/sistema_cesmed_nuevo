-- Crear tabla para consolidar salidas por nro_comprobante
CREATE TABLE public.consolidado_salidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nro_comprobante text NOT NULL UNIQUE,
  tipo_documento text NOT NULL DEFAULT 'Nota de Venta',
  patient_id uuid NULL,
  fecha_emision date NOT NULL DEFAULT CURRENT_DATE,
  importe_total numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  igv numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'emitido',
  estado_documento text NOT NULL DEFAULT 'Pendiente',
  forma_pago text NOT NULL DEFAULT 'Contado',
  observaciones text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

ALTER TABLE public.consolidado_salidas
  ADD CONSTRAINT consolidado_salidas_patient_id_fkey
  FOREIGN KEY (patient_id)
  REFERENCES public.patients(id)
  ON DELETE SET NULL;

CREATE INDEX idx_consolidado_salidas_fecha_emision
  ON public.consolidado_salidas (fecha_emision);

ALTER TABLE public.consolidado_salidas ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "Usuarios autenticados pueden ver consolidado_salidas"
ON public.consolidado_salidas
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear consolidado_salidas"
ON public.consolidado_salidas
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar consolidado_salidas"
ON public.consolidado_salidas
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar consolidado_salidas"
ON public.consolidado_salidas
FOR DELETE
USING (is_admin_by_role());
