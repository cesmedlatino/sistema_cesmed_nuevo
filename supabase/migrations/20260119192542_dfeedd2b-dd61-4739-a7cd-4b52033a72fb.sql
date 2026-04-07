-- Add column to track when medical record attention was registered
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS atencion_registrada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_atencion_registrada TIMESTAMP WITH TIME ZONE;