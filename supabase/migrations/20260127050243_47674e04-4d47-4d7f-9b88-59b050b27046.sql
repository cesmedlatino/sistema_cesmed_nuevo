-- Add turno column to pagos table
ALTER TABLE public.pagos 
ADD COLUMN turno text;

-- Add comment explaining the field
COMMENT ON COLUMN public.pagos.turno IS 'Turno del pago: Mañana (L-V 08:00-12:00, S 08:00-12:00) o Tarde (L-V 15:30+)';