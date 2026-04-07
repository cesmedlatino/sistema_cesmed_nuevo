-- Primero crear la función si no existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Crear tabla para Registros de Atenciones que relaciona historia clínica con receta
CREATE TABLE IF NOT EXISTS public.attention_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  specialist_id UUID REFERENCES public.specialists(id) ON DELETE SET NULL,
  attention_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_attention_records_medical_record ON public.attention_records(medical_record_id);
CREATE INDEX idx_attention_records_prescription ON public.attention_records(prescription_id);
CREATE INDEX idx_attention_records_patient ON public.attention_records(patient_id);
CREATE INDEX idx_attention_records_date ON public.attention_records(attention_date);

-- Habilitar RLS
ALTER TABLE public.attention_records ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Enable read access for all users" ON public.attention_records
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.attention_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.attention_records
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON public.attention_records
  FOR DELETE USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_attention_records_updated_at
  BEFORE UPDATE ON public.attention_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();