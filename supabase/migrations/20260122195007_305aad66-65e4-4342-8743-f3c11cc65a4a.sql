-- Add is_public column to optics_label_templates
ALTER TABLE public.optics_label_templates
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.optics_label_templates.is_public IS 'Indica si la plantilla está habilitada para todos los usuarios';