-- Add Estado de Cuenta field to appointments table
ALTER TABLE public.appointments 
ADD COLUMN estado_cuenta text DEFAULT 'Por Cancelar';

-- Update existing appointments based on their status
UPDATE public.appointments 
SET estado_cuenta = CASE 
  WHEN status = 'Completada' AND payment_confirmed = true THEN 'Cancelado'
  ELSE 'Por Cancelar'
END;