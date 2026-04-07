-- Crear tabla para configuración de comprobantes
CREATE TABLE public.comprobante_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name_line1 TEXT NOT NULL DEFAULT 'Centro de Especialidades Médicas',
  company_name_line2 TEXT NOT NULL DEFAULT 'Latinoamericano',
  company_legal_name TEXT NOT NULL DEFAULT 'CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L',
  ruc TEXT NOT NULL DEFAULT '20607644315',
  address_line1 TEXT NOT NULL DEFAULT 'Domicilio: Mz. G Lote. 17 Coop. Villa',
  address_line2 TEXT NOT NULL DEFAULT 'Pornogocha',
  address_line3 TEXT NOT NULL DEFAULT 'Paucarpata - Arequipa - Perú',
  phone TEXT NOT NULL DEFAULT '054-407301',
  whatsapp TEXT NOT NULL DEFAULT '950293377',
  document_title TEXT NOT NULL DEFAULT 'BOLETA DE VENTA',
  footer_line1 TEXT NOT NULL DEFAULT '¡Gracias por su preferencia!',
  footer_line2 TEXT NOT NULL DEFAULT 'Síguenos en redes sociales @cesmed.pe',
  footer_line3 TEXT NOT NULL DEFAULT 'www.cesmedlatinoamericano.com',
  font_size INTEGER NOT NULL DEFAULT 12,
  line_height TEXT NOT NULL DEFAULT '1.2',
  show_igv BOOLEAN NOT NULL DEFAULT true,
  igv_rate NUMERIC NOT NULL DEFAULT 0,
  currency_symbol TEXT NOT NULL DEFAULT 'S/.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Habilitar Row Level Security
ALTER TABLE public.comprobante_config ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan ver la configuración
CREATE POLICY "Usuarios autenticados pueden ver configuración de comprobantes"
ON public.comprobante_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política para que usuarios autenticados puedan crear configuración
CREATE POLICY "Usuarios autenticados pueden crear configuración de comprobantes"
ON public.comprobante_config
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Política para que usuarios autenticados puedan actualizar configuración
CREATE POLICY "Usuarios autenticados pueden actualizar configuración de comprobantes"
ON public.comprobante_config
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Política para que solo administradores puedan eliminar configuración
CREATE POLICY "Solo administradores pueden eliminar configuración de comprobantes"
ON public.comprobante_config
FOR DELETE
USING (is_admin_by_role());

-- Insertar configuración por defecto
INSERT INTO public.comprobante_config (
  company_name_line1,
  company_name_line2,
  company_legal_name,
  ruc,
  address_line1,
  address_line2,
  address_line3,
  phone,
  whatsapp,
  document_title,
  footer_line1,
  footer_line2,
  footer_line3,
  font_size,
  line_height,
  show_igv,
  igv_rate,
  currency_symbol
) VALUES (
  'Centro de Especialidades Médicas',
  'Latinoamericano',
  'CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L',
  '20607644315',
  'Domicilio: Mz. G Lote. 17 Coop. Villa',
  'Pornogocha',
  'Paucarpata - Arequipa - Perú',
  '054-407301',
  '950293377',
  'BOLETA DE VENTA',
  '¡Gracias por su preferencia!',
  'Síguenos en redes sociales @cesmed.pe',
  'www.cesmedlatinoamericano.com',
  12,
  '1.2',
  true,
  0,
  'S/.'
);