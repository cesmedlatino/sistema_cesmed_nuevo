-- Tabla para plantillas del Diseñador de Etiquetas (Óptica)
CREATE TABLE IF NOT EXISTS public.optics_label_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  paper_width_mm NUMERIC NOT NULL,
  paper_height_mm NUMERIC NOT NULL,
  paper_size_id TEXT NOT NULL DEFAULT 'custom',
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  zoom_used NUMERIC,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID
);

-- RLS
ALTER TABLE public.optics_label_templates ENABLE ROW LEVEL SECURITY;

-- Policies (por usuario)
DO $$ BEGIN
  CREATE POLICY "Users can view their own optics label templates"
  ON public.optics_label_templates
  FOR SELECT
  USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own optics label templates"
  ON public.optics_label_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own optics label templates"
  ON public.optics_label_templates
  FOR UPDATE
  USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own optics label templates"
  ON public.optics_label_templates
  FOR DELETE
  USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_optics_label_templates_created_by ON public.optics_label_templates (created_by);
CREATE INDEX IF NOT EXISTS idx_optics_label_templates_updated_at ON public.optics_label_templates (updated_at DESC);

-- Único predeterminado por usuario
CREATE UNIQUE INDEX IF NOT EXISTS optics_label_templates_one_default_per_user
ON public.optics_label_templates (created_by)
WHERE (is_default);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_optics_label_templates_updated_at ON public.optics_label_templates;
CREATE TRIGGER update_optics_label_templates_updated_at
BEFORE UPDATE ON public.optics_label_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
