-- Agregar campos necesarios para las historias clínicas basadas en plantillas
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.medical_record_templates(id),
ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_medical_records_template_id ON public.medical_records(template_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_form_data ON public.medical_records USING gin(form_data);