-- Primero, actualizar las citas que referencian pagos sin PagoID
UPDATE public.appointments 
SET payment_id = NULL 
WHERE payment_id IN (
  SELECT id FROM public.pagos 
  WHERE pago_id IS NULL OR pago_id = '' OR pago_id = 'Generando...'
);

-- Luego eliminar los registros de pagos sin PagoID
DELETE FROM public.pagos 
WHERE pago_id IS NULL OR pago_id = '' OR pago_id = 'Generando...';