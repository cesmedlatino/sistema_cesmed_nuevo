-- Add appointment_id column to supplies_attention_consumption table
-- This allows tracking consumption by appointment (turno) instead of only by medical record

ALTER TABLE public.supplies_attention_consumption 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_supplies_attention_consumption_appointment 
ON public.supplies_attention_consumption(appointment_id);

-- Add comment for documentation
COMMENT ON COLUMN public.supplies_attention_consumption.appointment_id IS 'Reference to the appointment/turno for which supplies were consumed';