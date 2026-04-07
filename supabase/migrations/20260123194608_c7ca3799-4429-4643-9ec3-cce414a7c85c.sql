-- Add especialidad_id column to concepto table
ALTER TABLE public.concepto
ADD COLUMN especialidad_id UUID REFERENCES public.medical_specialties(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_concepto_especialidad ON public.concepto(especialidad_id);