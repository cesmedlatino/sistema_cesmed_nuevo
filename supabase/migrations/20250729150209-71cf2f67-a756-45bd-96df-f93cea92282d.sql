-- Crear tabla concepto para los diferentes conceptos de pago
CREATE TABLE public.concepto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto DECIMAL(10,2) NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'consulta', -- consulta, procedimiento, examen, operacion, etc.
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Crear tabla modalidad para las modalidades de pago
CREATE TABLE public.modalidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL, -- Efectivo, Tarjeta, Transferencia, etc.
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Crear tabla documento_de_pago para los recibos
CREATE TABLE public.documento_de_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_documento TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  importe_total DECIMAL(10,2) NOT NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT DEFAULT 'emitido', -- emitido, anulado
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Crear tabla pagos principal
CREATE TABLE public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  specialist_id UUID REFERENCES public.specialists(id),
  concepto_id UUID REFERENCES public.concepto(id) NOT NULL,
  monto_pagado DECIMAL(10,2) NOT NULL,
  modalidad_id UUID REFERENCES public.modalidad(id) NOT NULL,
  tipo_confirmacion TEXT NOT NULL CHECK (tipo_confirmacion IN ('Captura', 'Voucher', 'Caja')),
  tiene_adjunto BOOLEAN DEFAULT false,
  archivo_confirmacion TEXT, -- URL del archivo subido
  documento_pago_id UUID REFERENCES public.documento_de_pago(id),
  confirmado BOOLEAN DEFAULT false,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Actualizar tabla appointments para agregar campos de pago
ALTER TABLE public.appointments 
ADD COLUMN payment_id UUID REFERENCES public.pagos(id),
ADD COLUMN payment_confirmed BOOLEAN DEFAULT false;

-- Insertar datos iniciales para concepto
INSERT INTO public.concepto (nombre, descripcion, monto, tipo) VALUES 
('Consulta Médica General', 'Consulta médica general', 50.00, 'consulta'),
('Consulta Especializada', 'Consulta con médico especialista', 80.00, 'consulta'),
('Examen de Laboratorio', 'Exámenes de laboratorio clínico', 30.00, 'examen'),
('Radiografía', 'Examen radiográfico', 40.00, 'examen'),
('Ecografía', 'Examen ecográfico', 60.00, 'examen'),
('Procedimiento Menor', 'Procedimientos médicos menores', 100.00, 'procedimiento'),
('Cirugía Menor', 'Cirugía ambulatoria menor', 200.00, 'operacion');

-- Insertar datos iniciales para modalidad
INSERT INTO public.modalidad (nombre, descripcion) VALUES 
('Efectivo', 'Pago en efectivo'),
('Tarjeta de Crédito', 'Pago con tarjeta de crédito'),
('Tarjeta de Débito', 'Pago con tarjeta de débito'),
('Transferencia Bancaria', 'Transferencia bancaria'),
('Yape', 'Pago con Yape'),
('Plin', 'Pago con Plin'),
('Depósito Bancario', 'Depósito en cuenta bancaria');

-- Habilitar RLS en todas las tablas
ALTER TABLE public.concepto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_de_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Políticas para concepto
CREATE POLICY "Todos pueden ver conceptos activos" ON public.concepto
  FOR SELECT USING (activo = true);

CREATE POLICY "Solo administradores pueden modificar conceptos" ON public.concepto
  FOR ALL USING (is_admin_by_role());

-- Políticas para modalidad
CREATE POLICY "Todos pueden ver modalidades activas" ON public.modalidad
  FOR SELECT USING (activo = true);

CREATE POLICY "Solo administradores pueden modificar modalidades" ON public.modalidad
  FOR ALL USING (is_admin_by_role());

-- Políticas para documento_de_pago
CREATE POLICY "Usuarios autenticados pueden ver documentos de pago" ON public.documento_de_pago
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear documentos de pago" ON public.documento_de_pago
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar documentos de pago" ON public.documento_de_pago
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar documentos de pago" ON public.documento_de_pago
  FOR DELETE USING (is_admin_by_role());

-- Políticas para pagos
CREATE POLICY "Usuarios autenticados pueden ver pagos" ON public.pagos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear pagos" ON public.pagos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar pagos" ON public.pagos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo administradores pueden eliminar pagos" ON public.pagos
  FOR DELETE USING (is_admin_by_role());

-- Crear función para generar número de documento
CREATE OR REPLACE FUNCTION public.generate_document_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    new_number TEXT;
    number_exists BOOLEAN;
BEGIN
    LOOP
        new_number := 'DOC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((FLOOR(RANDOM() * 999999) + 1)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM documento_de_pago WHERE numero_documento = new_number) INTO number_exists;
        IF NOT number_exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN new_number;
END;
$$;

-- Trigger para generar número de documento automáticamente
CREATE OR REPLACE FUNCTION public.set_document_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.numero_documento IS NULL OR NEW.numero_documento = '' THEN
    NEW.numero_documento := generate_document_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_documento_pago_number
  BEFORE INSERT ON public.documento_de_pago
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_number();

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_pagos_patient_id ON public.pagos(patient_id);
CREATE INDEX idx_pagos_concepto_id ON public.pagos(concepto_id);
CREATE INDEX idx_pagos_modalidad_id ON public.pagos(modalidad_id);
CREATE INDEX idx_appointments_payment_id ON public.appointments(payment_id);
CREATE INDEX idx_documento_pago_patient_id ON public.documento_de_pago(patient_id);