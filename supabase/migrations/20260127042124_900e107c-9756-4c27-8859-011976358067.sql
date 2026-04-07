-- Add fields for electronic documents (Boleta and Factura) to documento_de_pago table
-- These fields store customer/business information for electronic billing

ALTER TABLE public.documento_de_pago 
ADD COLUMN IF NOT EXISTS cliente_ruc TEXT,
ADD COLUMN IF NOT EXISTS cliente_razon_social TEXT,
ADD COLUMN IF NOT EXISTS cliente_direccion TEXT,
ADD COLUMN IF NOT EXISTS cliente_email TEXT,
ADD COLUMN IF NOT EXISTS cliente_telefono TEXT,
ADD COLUMN IF NOT EXISTS serie TEXT,
ADD COLUMN IF NOT EXISTS correlativo TEXT,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS igv NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forma_pago TEXT DEFAULT 'Contado',
ADD COLUMN IF NOT EXISTS condicion_pago TEXT,
ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Comments to document the fields
COMMENT ON COLUMN public.documento_de_pago.cliente_ruc IS 'RUC del cliente (para Factura) o DNI (para Boleta)';
COMMENT ON COLUMN public.documento_de_pago.cliente_razon_social IS 'Razón social o nombre completo del cliente';
COMMENT ON COLUMN public.documento_de_pago.cliente_direccion IS 'Dirección fiscal del cliente';
COMMENT ON COLUMN public.documento_de_pago.cliente_email IS 'Email para envío de documento electrónico';
COMMENT ON COLUMN public.documento_de_pago.cliente_telefono IS 'Teléfono del cliente';
COMMENT ON COLUMN public.documento_de_pago.serie IS 'Serie del documento electrónico (ej: B001 para Boleta, F001 para Factura)';
COMMENT ON COLUMN public.documento_de_pago.correlativo IS 'Número correlativo del documento electrónico';
COMMENT ON COLUMN public.documento_de_pago.subtotal IS 'Subtotal antes de IGV';
COMMENT ON COLUMN public.documento_de_pago.igv IS 'Monto del IGV (18%)';
COMMENT ON COLUMN public.documento_de_pago.forma_pago IS 'Forma de pago: Contado, Crédito';
COMMENT ON COLUMN public.documento_de_pago.condicion_pago IS 'Condiciones de pago para crédito';
COMMENT ON COLUMN public.documento_de_pago.fecha_vencimiento IS 'Fecha de vencimiento para pagos a crédito';