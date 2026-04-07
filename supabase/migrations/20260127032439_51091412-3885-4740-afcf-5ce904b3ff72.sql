-- Agregar campos tipo_documento y estado_documento a la tabla documento_de_pago
ALTER TABLE public.documento_de_pago 
ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'Nota de Venta',
ADD COLUMN IF NOT EXISTS estado_documento TEXT DEFAULT 'Pendiente';

-- Comentarios para documentar los campos
COMMENT ON COLUMN public.documento_de_pago.tipo_documento IS 'Tipo de documento: Nota de Venta, Boleta, Factura';
COMMENT ON COLUMN public.documento_de_pago.estado_documento IS 'Estado del documento: Pendiente, Emitido, Anulado';

-- Actualizar documentos existentes para sincronizar estado_documento con estado
UPDATE public.documento_de_pago 
SET estado_documento = COALESCE(estado, 'Pendiente'),
    tipo_documento = 'Nota de Venta'
WHERE estado_documento IS NULL;