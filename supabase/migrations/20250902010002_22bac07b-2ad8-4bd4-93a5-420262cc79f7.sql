-- Add estado_pago column to pagos table
ALTER TABLE public.pagos ADD COLUMN estado_pago TEXT DEFAULT 'Pendiente';

-- Add a check constraint to ensure valid payment status values
ALTER TABLE public.pagos ADD CONSTRAINT check_estado_pago 
CHECK (estado_pago IN ('Completo', 'Adelanto', 'Pendiente', 'Crédito', 'Anulado', 'Reembolsado'));